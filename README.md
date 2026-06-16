# Pharos DeFi Position Checker

Future-ready, read-only DeFi position checker for Pharos wallets.

Pharos DeFi is still emerging, so this skill is intentionally honest: it does not hallucinate active positions when no verified live protocol contracts are registered. By default it scans Pharos Atlantic testnet first, reports only adapter-verified balances, and keeps adapter-pending testnet surfaces out of normal wallet reports. Mainnet must be requested explicitly; when no live mainnet adapters are enabled yet, the report shows planned mainnet DeFi coverage from the ecosystem registry.

## Features

- Checks DeFi positions across one or many Pharos wallets.
- Defaults to Pharos Atlantic testnet and checks the live adapter registry first.
- Supports Pharos mainnet with `--network mainnet` when the user explicitly asks for mainnet.
- Uses a protocol registry in `assets/protocols.json`.
- Tracks official Pharos testnet DeFi surfaces in `assets/testnet-defi-sources.json` for future adapter work, but does not show adapter-pending surfaces as positions.
- Shows only adapter-verified non-zero balances in default wallet reports.
- Shows planned mainnet ecosystem coverage automatically when mainnet is requested and no live mainnet adapters are available.
- Future-ready adapters for ERC20 receipt tokens, ERC-4626 vaults, staking balances, ERC-721 position NFT counts, and protocol-transfer discovery.
- Formats human output as separated Markdown position bullets with the wallet printed once at the top.
- Supports saved wallet names with `--add-wallet`, `--list-wallets`, `--wallets Name`, and `--remove-wallet`.
- Exports human-readable, JSON, or CSV reports.
- Saves reports with `--save`.
- Includes snapshot block, timestamp, protocol readiness, and warnings.
- Never asks for private keys, seed phrases, signatures, approvals, swaps, or transactions.

## Install

```bash
npm install
```

## Usage

Default network is `atlantic-testnet`. Use `--network mainnet` only when the request explicitly needs Pharos mainnet.

Check a wallet:

```bash
npm run positions -- --wallets 0xWallet
```

Check saved and direct wallets:

```bash
npm run positions -- --wallets Main,0xWallet2
```

Show planned/future coverage:

```bash
npm run positions -- --wallets Main --include-planned
```

Check mainnet and show planned ecosystem coverage when no live adapters are available:

```bash
npm run positions -- --network mainnet --wallets 0xWallet
```

Include zero adapter checks:

```bash
npm run positions -- --wallets Main --include-zero
```

Discover recent transfer hints:

```bash
npm run positions -- --wallets Main --discover
```

JSON and CSV:

```bash
npm run positions -- --wallets Main --format json
npm run positions -- --wallets Main --format csv --save report.csv
```

## Saved Wallet Names

```bash
npm run positions -- --add-wallet Main:0xWallet
npm run positions -- --list-wallets
npm run positions -- --wallets Main
npm run positions -- --remove-wallet Main
```

Saved names live in `assets/wallet-labels.json`. Store public addresses only.

## Output Behavior

- Atlantic testnet is the default scan path.
- Default reports show active, adapter-verified positions only.
- Testnet integrations without a readable adapter stay in the catalog for future work, but are hidden from normal wallet reports.
- Mainnet reports show active positions if live adapters exist; otherwise they show planned mainnet DeFi coverage from the registry.
- ERC-721 LP adapters report position NFT counts only unless a detail adapter is added.
- Zero-balance checks are shown only with `--include-zero`.

## Adding Future Protocols

Add verified live protocols to `assets/protocols.json`. See `references/protocol-registry.md` for the schema and verification checklist.

The important design choice: planned protocols are documented but not scanned as live. Testnet adapter-pending surfaces are tracked for development, while user-facing reports stay limited to balances the checker can prove on-chain.

## Example Natural Language Prompts

- "Check my DeFi positions on Main"
- "Scan Main and Trading for Pharos DeFi"
- "Show planned DeFi coverage for Pharos"
- "Export positions as CSV"
- "Save wallet Main:0x..."
- "List saved wallets"
- "Remove wallet Main"

## Safety

This project is read-only. It only uses public RPC/explorer data and local JSON registries. It does not send transactions or perform write operations.
