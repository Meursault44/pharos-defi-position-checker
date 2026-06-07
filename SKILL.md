---
name: pharos-defi-position-checker
description: Future-ready read-only DeFi position checker for Pharos wallets. Use when the user asks to check, scan, compare, summarize, export, or monitor DeFi positions, lending supplies/borrows, staking balances, vault shares, LP exposure, yield positions, protocol activity, or saved wallet names on Pharos mainnet or Atlantic testnet, including cases where Pharos DeFi protocols are not live yet and the agent must return honest no-position/readiness reports instead of hallucinated positions.
---

# Pharos DeFi Position Checker

Use this skill to inspect DeFi positions for Pharos wallets with a future-ready protocol registry. The workflow is read-only: never request private keys, seed phrases, signatures, approvals, swaps, or transactions.

Always combine this skill with `pharos-skill-engine` for Pharos network context.

## Core Behavior

- Default network: `mainnet`.
- Supported network override: `atlantic-testnet`.
- Source of truth: `assets/protocols.json`.
- If no verified live DeFi protocols are enabled, say so clearly and return a readiness/no-position report.
- Do not invent TVL, APY, USD value, protocol contracts, or active positions.
- Use `--include-planned` when the user asks what future DeFi coverage is prepared.

## Fast Path

Run from the skill repository root:

```bash
npm run positions -- --wallets 0xWallet
```

Multiple wallets:

```bash
npm run positions -- --wallets Main,0xWallet2,Trading
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

## Saved Wallet Names

Use local public-address labels in `assets/wallet-labels.json`.

```bash
npm run positions -- --add-wallet Main:0xWallet
npm run positions -- --list-wallets
npm run positions -- --remove-wallet Main
npm run positions -- --wallets Main
```

Store public addresses only. Never store secrets.

## Natural Language Mapping

- "check my DeFi positions", "scan positions", "what DeFi do I have" -> `--wallets <wallets>`
- "show future coverage", "what will this support", "planned protocols" -> add `--include-planned`
- "find protocol activity", "discover DeFi", "recent transfers" -> add `--discover`
- "save wallet", "add wallet" -> `--add-wallet Name:0xAddress`
- "list saved wallets" -> `--list-wallets`
- "delete/remove wallet" -> `--remove-wallet Name`
- "JSON", "CSV", "save report" -> `--format json|csv` and optionally `--save <path>`

## Protocol Registry

Read `references/protocol-registry.md` when adding or reviewing protocol definitions.

Each live protocol entry should include:

- verified network
- verified contracts
- check definitions
- decimals or metadata strategy
- notes about limitations

Supported generic check types:

- `erc20-balance`
- `erc4626-share`
- `staking-balance`
- `reward-earned` (reserved for future reward adapters)

If a requested protocol is not in `assets/protocols.json`, explain that the registry needs verified contracts before active-position claims can be made.

## Reporting Rules

Return:

- network, chain ID, snapshot block, timestamp
- wallets scanned
- live vs planned protocol count
- active positions only by default
- zero checks only with `--include-zero`
- planned registry details only with `--include-planned`
- warnings for RPC/explorer failures
- explorer links for wallets when available

## Safety

- Read-only only.
- Never sign or send transactions.
- Never claim a future/planned protocol is live.
- Never infer a position from marketing pages alone.
- Mark explorer discovery matches as hints, not proof of current active positions.
