---
name: pharos-defi-position-checker
description: Future-ready read-only DeFi position checker for Pharos wallets. Use when the user asks to check, scan, compare, summarize, export, or monitor DeFi positions, lending supplies/borrows, staking balances, vault shares, LP exposure, yield positions, protocol activity, or saved wallet names on Pharos Atlantic testnet or Pharos mainnet, including cases where Pharos DeFi protocols are not live yet and the agent must return honest no-position/readiness reports instead of hallucinated positions.
---

# Pharos DeFi Position Checker

Use this skill to inspect DeFi positions for public Pharos wallets with a future-ready protocol registry. The workflow is read-only: never request private keys, seed phrases, signatures, approvals, swaps, or transactions.

Always combine this skill with `pharos-skill-engine` for Pharos network context, chain IDs, explorer links, and RPC assumptions.

## Prerequisites

- Node.js 18+ with npm dependencies installed in this skill repository.
- Public wallet addresses or saved public labels only.
- No private keys, seed phrases, signatures, write calls, approvals, swaps, or transactions.
- Use Pharos Atlantic testnet by default. Use Pharos mainnet only when the user explicitly asks for mainnet.

## Network Rules

- Default network: `atlantic-testnet`.
- Default scan order: check Atlantic testnet first unless the user explicitly asks for mainnet.
- Supported override: `mainnet`.
- Network source of truth: `assets/networks.json`.
- Protocol source of truth: `assets/protocols.json`.
- Official testnet DeFi catalog snapshot: `assets/testnet-defi-sources.json`.
- On `atlantic-testnet`, official DeFi surfaces from the Pharos testnet catalog can be tracked in the registry, but default reports show only adapter-verified balances.
- If a live testnet integration has no protocol-specific balance adapter yet, do not show it in default position reports.
- If no verified mainnet DeFi protocols are enabled, say so clearly and show planned mainnet DeFi coverage from the ecosystem registry when available.
- Do not invent TVL, APY, USD value, protocol contracts, token IDs, underlying LP assets, or active positions.

## Capability Index

| User need | Capability | Detailed instructions |
| --- | --- | --- |
| Check or scan DeFi positions for one wallet | Run the position checker on the default Atlantic testnet | `references/protocol-registry.md#scan-defi-positions` |
| Compare several wallets | Run the same scan with comma-separated wallets or labels | `references/protocol-registry.md#scan-defi-positions` |
| Show future or planned DeFi coverage | Include planned registry entries without treating them as live | `references/protocol-registry.md#include-planned-protocols` |
| Review official Pharos testnet DeFi surfaces | Read the testnet catalog before suggesting coverage | `references/protocol-registry.md#official-testnet-defi-catalog` |
| Discover possible protocol activity | Use explorer transfer hints and mark them as hints only | `references/protocol-registry.md#discover-protocol-hints` |
| Export a report | Render human, JSON, or CSV output and optionally save it | `references/protocol-registry.md#export-position-report` |
| Save, list, or remove public wallet labels | Maintain local address labels for convenience | `references/protocol-registry.md#manage-saved-wallet-labels` |
| Add or review protocol definitions | Update the registry only after contract verification | `references/protocol-registry.md#protocol-registry` |
| Troubleshoot scan failures | Explain RPC, explorer, registry, and wallet-name errors | `references/protocol-registry.md#common-failure-handling` |

## Fast Path

Run from the skill repository root:

```bash
npm run positions -- --wallets 0xWallet
```

Multiple wallets:

```bash
npm run positions -- --wallets Main,0xWallet2,Trading
```

Mainnet override:

```bash
npm run positions -- --network mainnet --wallets 0xWallet
```

Include planned protocols:

```bash
npm run positions -- --wallets Main --include-planned
```

Discover recent protocol-transfer hints:

```bash
npm run positions -- --wallets Main --discover
```

JSON or CSV:

```bash
npm run positions -- --wallets Main --format json
npm run positions -- --wallets Main --format csv --save report.csv
```

Help:

```bash
npm run positions -- --help
```

## Natural Language Mapping

- "check my DeFi positions", "scan positions", "what DeFi do I have" -> `--wallets <wallets>`
- "compare wallets" -> `--wallets <walletA>,<walletB>`
- "mainnet" -> add `--network mainnet`
- "show future coverage", "what will this support", "planned protocols" -> add `--include-planned`
- "find protocol activity", "discover DeFi", "recent transfers" -> add `--discover`
- "save wallet", "add wallet" -> `--add-wallet Name:0xAddress`
- "list saved wallets" -> `--list-wallets`
- "delete/remove wallet" -> `--remove-wallet Name`
- "JSON", "CSV", "save report" -> `--format json|csv` and optionally `--save <path>`

## Reporting Rules

Return:

- network, chain ID, snapshot block, timestamp
- wallets scanned
- live vs planned protocol count
- active adapter-verified positions only by default
- no adapter-pending testnet surfaces in default wallet reports
- ERC-721 position adapters report counts only unless a detail adapter exists
- zero checks only with `--include-zero`
- planned registry details with `--include-planned`; mainnet reports may show planned DeFi coverage by default when no live adapters are enabled
- warnings for RPC/explorer failures
- explorer links for wallets when available

## Safety

- Read-only only.
- Never sign or send transactions.
- Never claim a future/planned protocol is live.
- Never infer a position from marketing pages alone.
- Mark explorer discovery matches as hints, not proof of current active positions.
