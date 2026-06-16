# Protocol Registry Reference

The checker is designed to work before and after Pharos DeFi launches. Current mainnet entries can stay disabled or planned; Atlantic testnet DeFi surfaces from the public Pharos catalog can stay in the registry for adapter work, but default wallet reports show only adapter-verified balances.

Default network is Pharos Atlantic testnet. Use Pharos mainnet only when the user explicitly requests mainnet.

## Official Testnet DeFi Catalog

### Overview

The public Pharos testnet app exposes DeFi surfaces through `https://api.pharosnetwork.xyz/info/tasks` when called with `Referer: https://testnet.pharosnetwork.xyz/`. A static snapshot lives in `assets/testnet-defi-sources.json`.

Current Atlantic testnet DeFi surfaces include:

- AquaFlux for RWAfi structure/earn flows.
- FaroSwap for swap and liquidity pools.
- Bitverse for swap, liquidity, and trading flows.
- Zenith for lending; the public task catalog may still show this section as disabled.
- Faroo Staking for stPROS staking receipt balances discovered through Atlantic testnet explorer activity.
- Uniswap V3/V4 position NFT managers discovered through Atlantic testnet explorer activity.

### Agent Guidelines

- Treat the catalog as integration coverage, not proof of non-zero balances.
- Use `assets/protocols.json` for actual balance checks.
- If a protocol has no readable balance adapter yet, keep it out of default wallet reports.
- FaroSwap currently includes a DODO LP-token adapter for `DLP_90bfe28e`; add more LP token, AMM V2/V3 pool, or staking/mining contract checks as each one is verified.
- Zenith currently includes an `aWETH` supply-token balance adapter.
- Faroo Staking currently includes an `stPROS` staking-receipt balance adapter.
- AquaFlux currently includes RWAfi ERC-20 receipt-token balance adapters for UST/CORP products discovered on Atlantic testnet.
- Uniswap LP Positions currently includes ERC-721 `balanceOf` count adapters for V3 and V4 position managers. It reports position counts only.

## Scan DeFi Positions

### Overview

Scan public wallets against live protocol entries in `assets/protocols.json`. The scan is read-only and uses RPC calls such as `eth_blockNumber` and `eth_call`. On Atlantic testnet, default reports show only adapter-verified active balances.

### Command Template

```bash
npm run positions -- --wallets <wallet-or-label-list> [--network atlantic-testnet|mainnet] [--protocol <slug|all>] [--include-zero]
```

### Parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `--wallets` | Yes | Comma, space, semicolon, or newline separated wallet addresses and saved labels. |
| `--network` | No | Defaults to `atlantic-testnet`. Use `mainnet` only when explicitly requested. |
| `--protocol` | No | Restrict checks to a protocol slug or use `all`. |
| `--include-zero` | No | Include zero-balance checks in the output. |

### Output Parsing

Read these fields first:

- `network`, `chainId`, `snapshotBlock`, `snapshotTime`
- `wallets`
- `liveProtocolCount`, `plannedProtocolCount`
- `positions`
- `warnings`

For human answers, summarize active positions first. If `positions` is empty, say that no active positions were detected from the current live registry.

### Error Handling

- Missing wallets: ask for addresses or saved labels.
- Unknown saved label: suggest `--list-wallets`.
- RPC failure: report that the snapshot could not be completed and keep the warning visible.
- Empty live registry: return a readiness/no-position report, not invented balances.

### Agent Guidelines

- Never ask for a private key.
- Never call write methods.
- Never invent a non-zero balance. Adapter-pending integrations are coverage notes, not deposited value.
- Include snapshot block and network in the final answer.

## Include Planned Protocols

### Overview

Use planned entries to explain what the checker is prepared to support later. Planned entries are documentation only and are not evidence of live user positions.

### Command Template

```bash
npm run positions -- --wallets <wallet-or-label-list> --include-planned
```

### Output Parsing

Use `plannedProtocols` for coverage notes. Keep the distinction between `live` and `planned` visible.

### Agent Guidelines

- Say "planned" or "future-ready", not "active".
- Do not combine planned protocol notes with balances.

## Discover Protocol Hints

### Overview

Discovery checks recent explorer token transfers for addresses that match protocol contracts in the local registry. This can show historical contact with a protocol contract, but it does not prove a current position.

### Command Template

```bash
npm run positions -- --wallets <wallet-or-label-list> --discover
```

### Output Parsing

Use `discovery.matches` only as hints. If the explorer API fails, keep the warning in the answer.

### Agent Guidelines

- Label every discovery match as a hint.
- Run normal balance checks before relying on discovery.

## Export Position Report

### Overview

The checker can render reports as human text, JSON, or CSV. JSON is best for another agent. CSV is best for spreadsheets.

### Command Template

```bash
npm run positions -- --wallets <wallet-or-label-list> --format <human|json|csv> --save <path>
```

### Parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `--format` | No | Defaults to `human`. |
| `--save` | No | Writes the rendered report to a local file. |

### Agent Guidelines

- Prefer JSON when another tool will consume the result.
- Prefer human output when answering directly.

## Manage Saved Wallet Labels

### Overview

Saved labels are local aliases for public addresses. They are convenience data only and must never contain secrets.

### Command Templates

```bash
npm run positions -- --add-wallet Main:0xWallet
npm run positions -- --list-wallets
npm run positions -- --remove-wallet Main
```

### Agent Guidelines

- Store public EVM addresses only.
- Use short names with letters, numbers, dot, underscore, or dash.
- If the user needs a shared address book across skills, prefer the dedicated `pharos-wallet-address-book` skill.

## Protocol Registry

Path:

```text
assets/protocols.json
```

Top-level shape:

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-06-07",
  "protocols": []
}
```

## Protocol Entry

```json
{
  "name": "Example Lending",
  "slug": "example-lending",
  "network": "atlantic-testnet",
  "status": "live",
  "category": "lending",
  "url": "https://example.invalid",
  "contracts": [
    {
      "name": "eUSDC",
      "address": "0x0000000000000000000000000000000000000000",
      "standard": "erc20",
      "role": "supply-token",
      "tokenSymbol": "eUSDC",
      "tokenDecimals": 6
    }
  ],
  "checks": [
    {
      "type": "erc20-balance",
      "label": "Supplied USDC",
      "contract": "eUSDC",
      "category": "lending",
      "assetSymbol": "USDC",
      "decimals": 6
    }
  ],
  "notes": "Verified against explorer and protocol docs."
}
```

## Status Values

- `planned`: known future integration, not scanned as live.
- `live`: scanner runs checks when available; adapter-pending integrations are not shown as wallet positions by default.
- `disabled`: intentionally skipped.
- `deprecated`: historical protocol, skipped unless re-enabled.

## Check Types

### erc20-balance

Use for receipt tokens, LP tokens, staking shares, debt tokens, reward tokens, or vault shares that can be checked through `balanceOf(address)`.

### erc4626-share

Use for ERC-4626 vault shares. The checker reads:

- `balanceOf(wallet)`
- `asset()`
- `totalAssets()`
- `totalSupply()`

Do not compute USD value unless a trusted price source is added.

### staking-balance

Use for staking wrappers that expose `balanceOf(address)`. If a protocol uses `earned(address)`, add it later with the reserved reward adapter.

### nft-balance

Use for ERC-721 position manager contracts that expose `balanceOf(address)`. This reports the number of position NFTs only. Do not infer token IDs, underlying assets, fees, or liquidity amounts unless a dedicated position-detail adapter is added.

## Verification Checklist

Before marking a protocol `live`:

- Verify contract addresses in the explorer.
- Verify decimals by on-chain `decimals()`.
- Verify token symbols by on-chain `symbol()` or protocol docs.
- Run `npm run positions -- --wallets 0xKnownWallet --include-zero`.
- Confirm zero balances are reported as zero, not as errors.
- Confirm an active known wallet returns an active position.

## Common Failure Handling

| Failure | Response |
| --- | --- |
| `Missing --wallets` | Ask for wallet addresses or saved labels. |
| `Unknown wallet name` | Suggest `--list-wallets` or `--add-wallet Name:0xAddress`. |
| `Unsupported network` | Use `atlantic-testnet` or `mainnet`. |
| RPC HTTP or JSON-RPC error | Report the network, RPC error, and that no complete snapshot was produced. |
| Explorer discovery error | Keep the balance scan result and show discovery as unavailable. |
| Empty live registry | Return an honest no-position/readiness report. |

## What Not To Do

- Do not copy unverified addresses from chat or social posts.
- Do not mark protocols live from marketing pages alone.
- Do not assume 18 decimals.
- Do not call write functions.
- Do not invent APY, TVL, or USD values.
