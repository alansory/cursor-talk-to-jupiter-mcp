#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import { createObjectCsvWriter } from "csv-writer";
import { Connection } from "@solana/web3.js";
import { WALLET_PUBLIC_KEY, JUPITER_API_URL } from "../constants";

const logger = {
  info: (msg: string) => process.stderr.write(`[INFO] ${msg}\n`),
  debug: (msg: string) => process.stderr.write(`[DEBUG] ${msg}\n`),
  warn: (msg: string) => process.stderr.write(`[WARN] ${msg}\n`),
  error: (msg: string) => process.stderr.write(`[ERROR] ${msg}\n`),
  log: (msg: string) => process.stderr.write(`[LOG] ${msg}\n`),
};

const swapHistory: Array<{
  inputToken: string;
  outputToken: string;
  inputAmount: number;
  outputAmount: number;
  outputPrice: number;
  txId: string;
  timestamp: string;
}> = [];

const server = new McpServer({
  name: "TalkToJupiterMCP",
  version: "1.0.0",
});

// Define the expected content type for the handler's content array
type Content =
  | { type: "text"; text: string; [x: string]: unknown }
  | { type: "image"; data: string; mimeType: string; [x: string]: unknown }
  | { type: "audio"; data: string; mimeType: string; [x: string]: unknown }
  | {
      type: "resource";
      resource:
        | { text: string; uri: string; mimeType?: string; [x: string]: unknown }
        | { uri: string; blob: string; mimeType?: string; [x: string]: unknown };
      [x: string]: unknown;
    };

const tools: Record<
  string,
  {
    schema: ReturnType<typeof z.object>["shape"];
    handler: (params: any) => Promise<{
      content: Content[];
      _meta?: { [x: string]: unknown } | undefined;
      isError?: boolean | undefined;
    }>;
  }
> = {};

const getPriceSchema = z.object({
  inputToken: z.string(),
  outputToken: z.string(),
  amount: z.number().positive(),
  slippageBps: z.number().default(50),
});

tools["get_price"] = {
  schema: getPriceSchema.shape,
  handler: async ({ inputToken, outputToken, amount, slippageBps }) => {
    try {
      logger.info(`JUPITER API URL ${JUPITER_API_URL}/quote`);
      logger.info(`Getting price: ${inputToken} -> ${outputToken}, amount=${amount}`);
      const response = await axios.get(`${JUPITER_API_URL}/quote`, {
        params: { inputMint: inputToken, outputMint: outputToken, amount, slippageBps },
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`get_price error: ${message}`);
      return {
        content: [
          {
            type: "text",
            text: `Error getting price: ${message}`,
          },
        ],
        isError: true,
      };
    }
  },
};

Object.entries(tools).forEach(([name, { schema, handler }]) => {
  server.tool(name, `Tool: ${name}`, schema, handler);
});

const swapSchema = z.object({
  inputToken: z.string(),
  outputToken: z.string(),
  amount: z.number().positive(),
  slippageBps: z.number().default(50),
});

server.tool(
  "swap_tokens",
  "Swap tokens using Jupiter",
  swapSchema.shape,
  async ({ inputToken, outputToken, amount, slippageBps }) => {
    try {
      logger.info(`Swapping: ${inputToken} -> ${outputToken}, amount=${amount}`);
      const quoteResponse = await axios.get(`${JUPITER_API_URL}/quote`, {
        params: { inputMint: inputToken, outputMint: outputToken, amount, slippageBps },
      });

      const outputAmount = quoteResponse.data.outAmount;
      const outputPrice = outputAmount / amount;

      const swapResponse = await axios.post(`${JUPITER_API_URL}/swap`, {
        quoteResponse: quoteResponse.data,
        userPublicKey: WALLET_PUBLIC_KEY,
        wrapAndUnwrapSol: true,
      });

      const { swapTransaction } = swapResponse.data;
      const connection = new Connection("https://api.mainnet-beta.solana.com");
      const transaction = new Uint8Array(Buffer.from(swapTransaction, "base64"));
      const txId = await connection.sendRawTransaction(transaction);

      swapHistory.push({
        inputToken,
        outputToken,
        inputAmount: amount,
        outputAmount,
        outputPrice,
        txId,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Swap txId: ${txId}`);
      return {
        content: [{ type: "text", text: `Swap executed: ${txId}` }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`swap_tokens error: ${message}`);
      return {
        content: [{ type: "text", text: `Error executing swap: ${message}` }],
        isError: true,
      };
    }
  }
);

server.tool("calculate_profit_loss", "Calculate P/L", {}, async () => {
  try {
    if (swapHistory.length === 0) {
      return { content: [{ type: "text", text: "No swaps found" }] };
    }

    const details = await Promise.all(
      swapHistory.map(async (swap) => {
        const quote = await axios.get(`${JUPITER_API_URL}/quote`, {
          params: {
            inputMint: swap.inputToken,
            outputMint: swap.outputToken,
            amount: 1000000,
            slippageBps: 50,
          },
        });
        const currentPrice = quote.data.outAmount / 1000000;
        const profitLoss = (currentPrice - swap.outputPrice) * swap.outputAmount;
        return { ...swap, currentPrice, profitLoss };
      })
    );

    const totalPL = details.reduce((sum, s) => sum + s.profitLoss, 0);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ totalProfitLoss: totalPL, details }, null, 2),
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`calculate_profit_loss error: ${message}`);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

server.tool("export_swaps", "Export swap history", {}, async () => {
  try {
    if (swapHistory.length === 0) {
      return { content: [{ type: "text", text: "No swaps to export" }] };
    }

    const records = await Promise.all(
      swapHistory.map(async (swap) => {
        const quote = await axios.get(`${JUPITER_API_URL}/quote`, {
          params: {
            inputMint: swap.inputToken,
            outputMint: swap.outputToken,
            amount: 1000000,
            slippageBps: 50,
          },
        });
        const currentPrice = quote.data.outAmount / 1000000;
        const profitLoss = (currentPrice - swap.outputPrice) * swap.outputAmount;

        return { ...swap, currentPrice, profitLoss };
      })
    );

    const writer = createObjectCsvWriter({
      path: "swap_history.csv",
      header: [
        { id: "inputToken", title: "Input Token" },
        { id: "outputToken", title: "Output Token" },
        { id: "inputAmount", title: "Input Amount" },
        { id: "outputAmount", title: "Output Amount" },
        { id: "outputPrice", title: "Output Price" },
        { id: "currentPrice", title: "Current Price" },
        { id: "profitLoss", title: "Profit/Loss" },
        { id: "txId", title: "Transaction ID" },
        { id: "timestamp", title: "Timestamp" },
      ],
    });

    await writer.writeRecords(records);
    return {
      content: [{ type: "text", text: "Exported to swap_history.csv" }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`export_swaps error: ${message}`);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

server.prompt("trading_strategy", "Best practices for Jupiter trading", () => ({
  description: "Best practices for trading tokens using Jupiter",
  messages: [
    {
      role: "assistant",
      content: {
        type: "text",
        text: `
          Best Practices for Trading on Jupiter:

          1. **Research Before Swap**
            - Use \`get_price()\` to monitor tokens.
            - Avoid high slippage pairs.

          2. **Risk Management**
            - Do not swap more than 10% of your wallet.
            - Double-check wallet keys.

          3. **Execution**
            - Start with small swaps.
            - Use \`swap_tokens()\` with appropriate slippage.

          4. **Post Trade**
            - Track P/L with \`calculate_profit_loss()\`
            - Export history using \`export_swaps()\``,
      },
    },
  ],
}));

async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info("TalkToJupiterMCP server running...");

    let buffer = "";
    process.stdin.on("data", async (data) => {
      buffer += data.toString();

      try {
        const request = JSON.parse(buffer);
        buffer = "";

        if (!request.command || !tools[request.command]) {
          logger.error(`Unknown command: ${request.command}`);
          process.stdout.write(JSON.stringify({ error: `Unknown command: ${request.command}` }) + "\n");
          return;
        }

        const { schema, handler } = tools[request.command];
        const params = z.object(schema).parse(request.params || {});
        const response = await handler(params);
        process.stdout.write(JSON.stringify(response) + "\n");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Command error: ${message}`);
        process.stdout.write(JSON.stringify({ error: message }) + "\n");
        buffer = "";
      }
    });

    process.stdin.on("end", () => {
      logger.info("Stdin closed");
    });

    await new Promise(() => {});
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Server start error: ${message}`);
    process.exit(1);
  }
}

main();