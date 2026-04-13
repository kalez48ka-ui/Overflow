import { http, createConfig, createStorage, cookieStorage } from "wagmi";
import { defineChain } from "viem";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
} from "@rainbow-me/rainbowkit/wallets";

// ---------------------------------------------------------------------------
// WireFluid Testnet chain definition
// ---------------------------------------------------------------------------
export const wireFluid = defineChain({
  id: 7777,
  name: "WireFluid Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "WIRE",
    symbol: "WIRE",
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.wirefluid.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "WireFluid Explorer",
      url: "https://testnet-explorer.wirefluid.com",
    },
  },
  testnet: true,
});

// ---------------------------------------------------------------------------
// Wallet connectors — MetaMask + injected always work without a project ID.
// WalletConnect is only added when a real project ID is provided.
// ---------------------------------------------------------------------------
const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";
const hasValidProjectId =
  wcProjectId.length > 10 && wcProjectId !== "YOUR_PROJECT_ID" && wcProjectId !== "demo";

const walletList: Parameters<typeof connectorsForWallets>[0] = [
  {
    groupName: "Recommended",
    wallets: [
      injectedWallet,
      metaMaskWallet,
      coinbaseWallet,
      ...(hasValidProjectId ? [walletConnectWallet] : []),
    ],
  },
];

const connectors = connectorsForWallets(walletList, {
  appName: "Overflow",
  projectId: hasValidProjectId ? wcProjectId : "placeholder_unused",
});

// ---------------------------------------------------------------------------
// wagmi config
// ---------------------------------------------------------------------------
export const wagmiConfig = createConfig({
  connectors,
  chains: [wireFluid],
  transports: {
    [wireFluid.id]: http("https://testnet-rpc.wirefluid.com"),
  },
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
});

// Contract addresses (placeholder)
export const CONTRACTS = {
  TRADING_HUB: "0x0000000000000000000000000000000000000001",
  VAULT: "0x0000000000000000000000000000000000000002",
  TOKENS: {
    IU: "0x0000000000000000000000000000000000000010",
    LQ: "0x0000000000000000000000000000000000000011",
    MS: "0x0000000000000000000000000000000000000012",
    KK: "0x0000000000000000000000000000000000000013",
    PZ: "0x0000000000000000000000000000000000000014",
    QG: "0x0000000000000000000000000000000000000015",
  },
} as const;

// Minimal ABI for trading
export const TRADING_HUB_ABI = [
  {
    name: "buyTokens",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "tokenAddress", type: "address" },
      { name: "minAmountOut", type: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
  {
    name: "sellTokens",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenAddress", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
  {
    name: "getPrice",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenAddress", type: "address" }],
    outputs: [{ name: "price", type: "uint256" }],
  },
] as const;
