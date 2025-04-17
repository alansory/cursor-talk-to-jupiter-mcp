# Cursor Talk to Jupiter MCP

A Model Context Protocol (MCP) server that integrates Jupiter Exchange with Cursor IDE, enabling seamless DeFi operations on Solana:
- Token swaps
- Price quotes
- Profit/loss calculation
- CSV export functionality

## Features

- 🔄 Real-time token swap quotes from Jupiter API
- 💱 Execute token swaps directly on Solana
- 📊 Calculate profit/loss for your trades
- 📥 Export complete swap history to CSV

## Prerequisites

Before you begin, ensure you have the following:
- ✨ [Solana wallet](https://phantom.app/) (e.g., Phantom, Solflare, Jupiter etc) with your private/public keys
- 🏃‍♂️ [Bun](https://bun.sh/) installed on your system
- 💻 [Cursor IDE](https://cursor.sh/) installed

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/alansory/cursor-talk-to-jupiter-mcp.git
   cd cursor-talk-to-jupiter-mcp
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Configure environment**
   Create a `.env` file with the following:
   ```env
   WALLET_PRIVATE_KEY=your_solana_wallet_private_key
   WALLET_PUBLIC_KEY=your_solana_wallet_public_key
   JUPITER_API_URL=https://lite-api.jup.ag/swap/v1
   ```

4. **Start the server**
   ```bash
   bun src/talk_to_jupiter_mcp/server.ts
   ```

## Cursor Integration

1. **Configure MCP**
   Add the following to `~/.cursor/mcp.json`:
   ```json
   {
     "mcpServers": {
       "TalkToJupiter": {
         "command": "bun",
         "args": ["cursor-talk-to-jupiter-mcp@latest"]
       }
     }
   }
   ```

2. **Available Commands**
   Use these commands in Cursor Composer mode:
   - `Get price quote for swapping 1 SOL to USDC`
   - `Swap 1000000000 lamports of SOL to USDC`
   - `Calculate profit or loss for my Jupiter swaps`
   - `Export my swap history to CSV`

## Testing

- 🔍 Use `pnpm inspect` to launch the MCP Inspector UI for debugging
- ⚠️ Always test swaps with small amounts on Solana mainnet first

## Contributing

We welcome contributions! Here's how you can help:
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Submit a pull request

