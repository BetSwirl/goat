# Vercel AI with BetSwirl Example

This example demonstrates how to use GOAT with Vercel AI SDK and BetSwirl for betting (on Base, Arbitrum, Polygon, Avalanche, BNB Chain). It provides a natural language interface for BetSwirl's games of chance (Coin Toss, Dice and Roulette) through an interactive CLI.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Copy the `.env.template` and populate with your values:
```bash
cp .env.template .env
```

### Required Environment Variables:
- `OPENAI_API_KEY`: Your OpenAI API key for the AI model
  - Get from: https://platform.openai.com/api-keys
  - Format: "sk-" followed by random characters
- `WALLET_PRIVATE_KEY`: Your wallet's private key
  - Format: 64-character hex string with '0x' prefix
  - ⚠️ Never share or commit your private key
- `RPC_PROVIDER_URL`: EVM network RPC URL
  - Format: Full URL with API key (if required)
  - Example: https://mainnet.base.org
  - See: [Environment Variables Guide](../../../docs/environment-variables.mdx)

For detailed information about environment variable formats and how to obtain API keys, see the [Environment Variables Guide](../../../docs/environment-variables.mdx).

## Usage

1. Run the interactive CLI:
```bash
npx ts-node index.ts
```

2. Example interactions:
```
# BetSwirl games
bet 0.0001 ETH on coin toss
```

3. Understanding responses:
   - Transaction confirmations
   - Bet details
