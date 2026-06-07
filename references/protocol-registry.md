# Protocol Registry Reference

The checker is designed to work before and after Pharos DeFi launches. Current planned entries can stay disabled or planned; live entries should be added only after contract addresses are verified.

## Registry File

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
  "network": "mainnet",
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
- `live`: verified contracts; scanner runs checks.
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

## Verification Checklist

Before marking a protocol `live`:

- Verify contract addresses in the explorer.
- Verify decimals by on-chain `decimals()`.
- Verify token symbols by on-chain `symbol()` or protocol docs.
- Run `npm run positions -- --wallets 0xKnownWallet --include-zero`.
- Confirm zero balances are reported as zero, not as errors.
- Confirm an active known wallet returns an active position.

## What Not To Do

- Do not copy unverified addresses from chat or social posts.
- Do not mark protocols live from marketing pages alone.
- Do not assume 18 decimals.
- Do not call write functions.
- Do not invent APY, TVL, or USD values.
