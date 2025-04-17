Cursor Talk to Jupiter MCP
A Model Context Protocol (MCP) server to integrate Jupiter Exchange with Cursor IDE, enabling token swaps, price quotes, profit/loss calculation, and CSV export on Solana.
Features

Fetch token swap quotes from Jupiter API.
Execute token swaps on Solana.
Calculate profit/loss for swaps.
Export swap history to CSV.

Prerequisites

Solana wallet (e.g., Phantom) with private/public keys.
Bun installed.
Cursor IDE.

Setup

Clone the repository:git clone https://github.com/your-username/cursor-talk-to-jupiter-mcp.git
cd cursor-talk-to-jupiter-mcp


Install dependencies:bun install


Create .env file:WALLET_PRIVATE_KEY=your_solana_wallet_private_key
WALLET_PUBLIC_KEY=your_solana_wallet_public_key
JUPITER_API_URL=https://quote-api.jup.ag/v6


Run the server:bun src/talk_to_jupiter_mcp/server.ts



Cursor Integration

Add to ~/.cursor/mcp.json:{
  "mcpServers": {
    "TalkToJupiter": {
      "command": "bun",
      "args": ["src/talk_to_jupiter_mcp/server.ts"]
    }
  }
}


Use in Cursor Composer mode with commands like:
Get price quote for swapping 1 SOL to USDC
Swap 1000000000 lamports of SOL to USDC
Calculate profit or loss for my Jupiter swaps
Export my swap history to CSV



Testing

Run pnpm inspect to launch MCP Inspector UI for debugging.
Test swaps with small amounts on Solana mainnet.

Contributing
Contributions are welcome! Fork the repo, create a branch, and submit a pull request.
