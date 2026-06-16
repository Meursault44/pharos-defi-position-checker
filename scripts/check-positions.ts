#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

const SELECTORS = {
  balanceOf: "70a08231",
  decimals: "313ce567",
  symbol: "95d89b41",
  name: "06fdde03",
  totalSupply: "18160ddd",
  asset: "38d52e0f",
  totalAssets: "01e1d114",
} as const;

type CliArgs = Record<string, string | boolean>;
type OutputFormat = "human" | "json" | "csv";
type ProtocolStatus = "live" | "planned" | "deprecated" | "disabled";
type CheckType = "erc20-balance" | "erc4626-share" | "staking-balance" | "nft-balance" | "reward-earned";

type NetworkConfig = {
  name: string;
  rpcUrl: string;
  chainId: number;
  explorerUrl?: string;
  explorerApiUrl?: string;
  nativeToken: string;
};

type NetworksFile = {
  networks: NetworkConfig[];
  defaultNetwork?: string;
};

type TokenConfig = {
  symbol: string;
  name?: string;
  address: string;
  decimals: number;
  isNative?: boolean;
};

type ProtocolContract = {
  name: string;
  address: string;
  standard?: string;
  role?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
};

type ProtocolCheck = {
  type: CheckType;
  label: string;
  contract: string;
  category?: string;
  assetSymbol?: string;
  decimals?: number;
  rewardToken?: string;
};

type ProtocolConfig = {
  name: string;
  slug: string;
  network: string;
  status: ProtocolStatus;
  category: string;
  url?: string | null;
  contracts?: ProtocolContract[];
  checks?: ProtocolCheck[];
  notes?: string;
};

type ProtocolsFile = {
  schemaVersion: number;
  updatedAt?: string;
  notes?: string[];
  protocols: ProtocolConfig[];
};

type WalletSpec = {
  label: string | null;
  address: string;
};

type Position = {
  walletLabel: string | null;
  wallet: string;
  protocol: string;
  protocolSlug: string;
  category: string;
  checkType: CheckType;
  label: string;
  contract: string;
  assetSymbol: string;
  balanceRaw: string;
  balance: string;
  status: "active" | "zero" | "warning";
  metadata?: Record<string, string | number | null>;
};

type Report = {
  network: string;
  chainId: number;
  snapshotBlock: number;
  snapshotTime: string;
  walletCount: number;
  protocolCount: number;
  liveProtocolCount: number;
  plannedProtocolCount: number;
  wallets: Array<{
    label: string | null;
    address: string;
    explorerUrl: string | null;
  }>;
  positions: Position[];
  plannedProtocols: Array<{
    name: string;
    slug: string;
    category: string;
    notes?: string;
  }>;
  discovery: {
    enabled: boolean;
    matches: Array<{
      wallet: string;
      protocol: string;
      contract: string;
      hint: string;
    }>;
  };
  warnings: string[];
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    args[key.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
  }
  return args;
}

function stringArg(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function boolArg(value: string | boolean | undefined): boolean {
  return value === true || value === "true";
}

function isAddress(value: unknown): value is string {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function loadJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function printHelp(): void {
  console.log(`Pharos DeFi Position Checker

Usage:
  npm run positions -- --wallets 0xWallet1,0xWallet2 [options]

Position checks:
  --wallets <list>          Wallet addresses
  --network <name>          atlantic-testnet (default) or mainnet
  --protocol <slug|all>     Limit checks to one protocol slug
  --include-planned         Include planned protocol notes in human output
  --include-zero            Include zero-balance checks in reports
  --discover                Scan recent explorer transfers for protocol contract hints
  --format <human|json|csv> Output format, default human
  --save <path>             Save rendered report to a file
  --help                    Show this help

Examples:
  npm run positions -- --wallets 0x... --include-planned
  npm run positions -- --wallets 0x...,0x... --discover
  npm run positions -- --wallets 0x... --format json --save report.json`);
}

function resolveFormat(value: string | undefined): OutputFormat {
  const format = value || "human";
  if (format === "human" || format === "json" || format === "csv") return format;
  throw new Error(`Unsupported format: ${format}. Use human, json, or csv.`);
}

function parseWallets(value: string | undefined): WalletSpec[] {
  if (!value) return [];
  return value
    .split(/[,\s;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      if (isAddress(item)) return { label: null, address: item };
      throw new Error(`Invalid wallet address: ${item}. Resolve saved aliases with pharos-wallet-address-book before running this checker.`);
    });
}

function loadNetwork(name: string | undefined): NetworkConfig {
  const networks = loadJson<NetworksFile>(path.join(ROOT, "assets", "networks.json"));
  const selected = name || networks.defaultNetwork || "atlantic-testnet";
  const network = networks.networks.find((item) => item.name === selected);
  if (!network) throw new Error(`Unsupported network: ${selected}`);
  return network;
}

function loadProtocols(network: string, protocolFilter?: string): ProtocolConfig[] {
  const registry = loadJson<ProtocolsFile>(path.join(ROOT, "assets", "protocols.json"));
  return registry.protocols.filter((protocol) => {
    if (protocol.network !== network) return false;
    if (!protocolFilter || protocolFilter === "all") return true;
    return protocol.slug === protocolFilter || protocol.name.toLowerCase() === protocolFilter.toLowerCase();
  });
}

function loadTokens(network: string): TokenConfig[] {
  const tokens = loadJson<Record<string, TokenConfig[]>>(path.join(ROOT, "assets", "tokens.json"));
  return tokens[network] || [];
}

async function rpc<T = unknown>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const json = (await response.json()) as { error?: { code: number; message: string }; result?: T };
  if (json.error) throw new Error(`${json.error.code}: ${json.error.message}`);
  return json.result as T;
}

async function ethCall(rpcUrl: string, to: string, data: string, blockTag: string): Promise<string> {
  return rpc<string>(rpcUrl, "eth_call", [{ to, data }, blockTag]);
}

function padAddress(address: string): string {
  return address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

function decodeUint(hex: string | null | undefined): string | null {
  if (!hex || hex === "0x") return null;
  return BigInt(hex).toString();
}

function decodeAddress(hex: string | null | undefined): string | null {
  if (!hex || hex === "0x") return null;
  const clean = hex.replace(/^0x/, "");
  if (clean.length < 40) return null;
  return `0x${clean.slice(-40)}`;
}

function formatAmount(raw: string, decimals: number): string {
  const value = BigInt(raw);
  const scale = 10n ** BigInt(decimals);
  const whole = value / scale;
  const fraction = value % scale;
  if (fraction === 0n) return whole.toString();
  return `${whole}.${fraction.toString().padStart(decimals, "0").replace(/0+$/g, "")}`;
}

function contractLookup(protocol: ProtocolConfig): Map<string, ProtocolContract> {
  const lookup = new Map<string, ProtocolContract>();
  for (const contract of protocol.contracts || []) {
    lookup.set(contract.name, contract);
    lookup.set(contract.address.toLowerCase(), contract);
  }
  return lookup;
}

function explorerAddressUrl(network: NetworkConfig, address: string): string | null {
  if (!network.explorerUrl) return null;
  return `${network.explorerUrl.replace(/\/+$/, "")}/address/${address}`;
}

async function runCheck(
  rpcUrl: string,
  blockHex: string,
  wallet: WalletSpec,
  protocol: ProtocolConfig,
  check: ProtocolCheck,
  warnings: string[],
): Promise<Position | null> {
  const contracts = contractLookup(protocol);
  const contract = contracts.get(check.contract) || contracts.get(check.contract.toLowerCase());
  const contractAddress = contract?.address || (isAddress(check.contract) ? check.contract : null);
  if (!contractAddress) {
    warnings.push(`${protocol.name} ${check.label}: contract not found in registry`);
    return null;
  }

  try {
    if (check.type === "erc20-balance" || check.type === "staking-balance" || check.type === "nft-balance") {
      const raw = decodeUint(await ethCall(rpcUrl, contractAddress, `0x${SELECTORS.balanceOf}${padAddress(wallet.address)}`, blockHex));
      if (raw === null) throw new Error("empty balanceOf response");
      const decimals = check.decimals ?? contract?.tokenDecimals ?? (check.type === "nft-balance" ? 0 : 18);
      return {
        walletLabel: wallet.label,
        wallet: wallet.address,
        protocol: protocol.name,
        protocolSlug: protocol.slug,
        category: check.category || protocol.category,
        checkType: check.type,
        label: check.label,
        contract: contractAddress,
        assetSymbol: check.assetSymbol || contract?.tokenSymbol || contract?.name || "UNKNOWN",
        balanceRaw: raw,
        balance: formatAmount(raw, decimals),
        status: BigInt(raw) > 0n ? "active" : "zero",
      };
    }

    if (check.type === "erc4626-share") {
      const raw = decodeUint(await ethCall(rpcUrl, contractAddress, `0x${SELECTORS.balanceOf}${padAddress(wallet.address)}`, blockHex));
      if (raw === null) throw new Error("empty balanceOf response");
      const decimals = check.decimals ?? contract?.tokenDecimals ?? 18;
      const metadata: Record<string, string | number | null> = {};
      try {
        metadata.underlyingAsset = decodeAddress(await ethCall(rpcUrl, contractAddress, `0x${SELECTORS.asset}`, blockHex));
        metadata.totalAssetsRaw = decodeUint(await ethCall(rpcUrl, contractAddress, `0x${SELECTORS.totalAssets}`, blockHex));
        metadata.totalSupplyRaw = decodeUint(await ethCall(rpcUrl, contractAddress, `0x${SELECTORS.totalSupply}`, blockHex));
      } catch (error) {
        warnings.push(`${protocol.name} ${check.label}: ERC-4626 metadata partial failure: ${(error as Error).message}`);
      }
      return {
        walletLabel: wallet.label,
        wallet: wallet.address,
        protocol: protocol.name,
        protocolSlug: protocol.slug,
        category: check.category || protocol.category,
        checkType: check.type,
        label: check.label,
        contract: contractAddress,
        assetSymbol: check.assetSymbol || contract?.tokenSymbol || contract?.name || "VAULT",
        balanceRaw: raw,
        balance: formatAmount(raw, decimals),
        status: BigInt(raw) > 0n ? "active" : "zero",
        metadata,
      };
    }

    warnings.push(`${protocol.name} ${check.label}: unsupported check type ${check.type}`);
    return null;
  } catch (error) {
    warnings.push(`${protocol.name} ${check.label} failed for ${wallet.address}: ${(error as Error).message}`);
    return null;
  }
}

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers: { accept: "application/json" }, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function collectAddresses(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectAddresses(item, found);
    return found;
  }
  if (!value || typeof value !== "object") return found;
  for (const item of Object.values(value)) {
    if (isAddress(item)) found.add(item.toLowerCase());
    else collectAddresses(item, found);
  }
  return found;
}

async function discoverProtocolHints(network: NetworkConfig, wallets: WalletSpec[], protocols: ProtocolConfig[], warnings: string[]): Promise<Report["discovery"]["matches"]> {
  if (!network.explorerApiUrl) {
    warnings.push("Discovery skipped: network has no explorerApiUrl");
    return [];
  }

  const registry = new Map<string, ProtocolConfig>();
  for (const protocol of protocols) {
    for (const contract of protocol.contracts || []) registry.set(contract.address.toLowerCase(), protocol);
  }

  const matches: Report["discovery"]["matches"] = [];
  for (const wallet of wallets) {
    const url = `${network.explorerApiUrl.replace(/\/+$/, "")}/v1/explorer/address/${wallet.address}/token_transfers?limit=100&page=1`;
    try {
      const json = await fetchJson(url);
      for (const address of collectAddresses(json)) {
        const protocol = registry.get(address);
        if (protocol) {
          matches.push({ wallet: wallet.address, protocol: protocol.name, contract: address, hint: "recent token transfer matched protocol registry" });
        }
      }
    } catch (error) {
      warnings.push(`Discovery failed for ${wallet.address}: ${(error as Error).message}`);
    }
  }
  return matches;
}

function toCsv(report: Report): string {
  const rows: Array<Array<string | number | null>> = [
    ["network", "block", "timestamp", "wallet_label", "wallet", "protocol", "category", "position", "asset", "balance", "balance_raw", "status", "contract"],
  ];
  for (const position of report.positions) {
    rows.push([
      report.network,
      report.snapshotBlock,
      report.snapshotTime,
      position.walletLabel || "",
      position.wallet,
      position.protocol,
      position.category,
      position.label,
      position.assetSymbol,
      position.balance,
      position.balanceRaw,
      position.status,
      position.contract,
    ]);
  }
  return rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}

function toHuman(report: Report, includePlanned: boolean): string {
  const lines: string[] = [];
  lines.push("PHAROS DEFI POSITION CHECKER");
  lines.push(`Network: ${report.network} (chain ${report.chainId})`);
  lines.push(`Snapshot: block ${report.snapshotBlock} at ${report.snapshotTime}`);
  lines.push(`Wallets: ${report.walletCount} | Protocols: ${report.liveProtocolCount} live, ${report.plannedProtocolCount} planned`);
  if (report.wallets.length > 0) {
    const walletLabels = report.wallets.map((wallet) => wallet.label ? `${wallet.label} (${shortAddress(wallet.address)})` : shortAddress(wallet.address));
    lines.push(`Wallet: ${walletLabels.join(", ")}`);
  }
  lines.push("");

  const active = report.positions.filter((position) => position.status === "active");
  if (active.length === 0) {
    lines.push("Active balance positions: none detected by the current adapters.");
    if (report.liveProtocolCount === 0) lines.push("Registry note: no live Pharos DeFi protocols are enabled for this network.");
  } else {
    lines.push("Active balance positions:");
    active.forEach((position, index) => {
      lines.push("");
      lines.push(`- **${index + 1}. ${position.protocol}**`);
      lines.push(`  Position: ${position.label}`);
      lines.push(`  Balance: ${position.balance} ${position.assetSymbol}`);
      lines.push(`  Contract: ${position.contract}`);
    });
  }

  const zero = report.positions.filter((position) => position.status === "zero");
  if (zero.length > 0) {
    lines.push("");
    lines.push(`Zero checks: ${zero.length}`);
  }

  if ((includePlanned || report.network === "mainnet") && report.plannedProtocols.length > 0) {
    lines.push("");
    lines.push(report.network === "mainnet" ? "Planned mainnet DeFi coverage:" : "Planned protocol registry:");
    for (const protocol of report.plannedProtocols) {
      lines.push("");
      lines.push(`- **${protocol.name}**`);
      lines.push(`  Category: ${protocol.category}`);
      lines.push(`  Status: planned`);
      lines.push(`  Notes: ${protocol.notes || "awaiting verified contracts"}`);
    }
  }

  if (report.discovery.enabled) {
    lines.push("");
    lines.push(`Discovery matches: ${report.discovery.matches.length}`);
    for (const match of report.discovery.matches) {
      lines.push(`- ${shortAddress(match.wallet)} touched ${match.protocol} contract ${shortAddress(match.contract)} (${match.hint})`);
    }
  }

  if (report.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const warning of report.warnings) lines.push(`- ${warning}`);
  }

  lines.push("");
  lines.push("Safety: read-only report. No private keys, signatures, approvals, swaps, or transactions.");
  return lines.join("\n");
}

function render(report: Report, format: OutputFormat, includePlanned: boolean): string {
  if (format === "json") return JSON.stringify(report, null, 2);
  if (format === "csv") return toCsv(report);
  return toHuman(report, includePlanned);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  if (boolArg(args.help) || boolArg(args.h)) {
    printHelp();
    return;
  }

  if (args["add-wallet"] || args["remove-wallet"] || args["list-wallets"]) {
    throw new Error("Wallet address book commands are not supported by this checker. Use pharos-wallet-address-book to manage aliases, then pass direct addresses with --wallets.");
  }

  const wallets = parseWallets(stringArg(args.wallets) || stringArg(args.wallet));
  if (wallets.length === 0) throw new Error("Missing --wallets address list");

  const network = loadNetwork(stringArg(args.network));
  const protocols = loadProtocols(network.name, stringArg(args.protocol));
  const format = resolveFormat(stringArg(args.format));
  const includeZero = boolArg(args["include-zero"]);
  const includePlanned = boolArg(args["include-planned"]);
  const warnings: string[] = [];

  const blockHex = await rpc<string>(network.rpcUrl, "eth_blockNumber", []);
  const snapshotBlock = Number(BigInt(blockHex));
  const snapshotTime = new Date().toISOString();

  const liveProtocols = protocols.filter((protocol) => protocol.status === "live");
  const plannedProtocols = protocols.filter((protocol) => protocol.status === "planned");
  const positions: Position[] = [];

  for (const wallet of wallets) {
    for (const protocol of liveProtocols) {
      const checks = protocol.checks || [];
      const protocolPositions: Position[] = [];
      for (const check of checks) {
        const position = await runCheck(network.rpcUrl, blockHex, wallet, protocol, check, warnings);
        if (position) protocolPositions.push(position);
      }
      const visiblePositions = protocolPositions.filter((position) => includeZero || position.status !== "zero");
      positions.push(...visiblePositions);
    }
  }

  const discoveryMatches = boolArg(args.discover) ? await discoverProtocolHints(network, wallets, protocols, warnings) : [];
  const report: Report = {
    network: network.name,
    chainId: network.chainId,
    snapshotBlock,
    snapshotTime,
    walletCount: wallets.length,
    protocolCount: protocols.length,
    liveProtocolCount: liveProtocols.length,
    plannedProtocolCount: plannedProtocols.length,
    wallets: wallets.map((wallet) => ({
      label: wallet.label,
      address: wallet.address,
      explorerUrl: explorerAddressUrl(network, wallet.address),
    })),
    positions,
    plannedProtocols: plannedProtocols.map((protocol) => ({
      name: protocol.name,
      slug: protocol.slug,
      category: protocol.category,
      notes: protocol.notes,
    })),
    discovery: {
      enabled: boolArg(args.discover),
      matches: discoveryMatches,
    },
    warnings,
  };

  const output = render(report, format, includePlanned);
  const savePath = stringArg(args.save);
  if (savePath) {
    fs.writeFileSync(savePath, output.endsWith("\n") ? output : `${output}\n`, "utf8");
    console.log(`Saved ${format} report to ${savePath}`);
  } else {
    console.log(output);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({
    error: message,
    hint: message.includes("Missing --wallets")
      ? "Pass direct wallet addresses with --wallets 0xWallet. Resolve aliases with pharos-wallet-address-book first."
      : message.includes("Wallet address book commands")
        ? "Use pharos-wallet-address-book for alias management, then run this checker with direct addresses."
      : "Use --help for usage examples.",
  }, null, 2));
  process.exit(1);
});
