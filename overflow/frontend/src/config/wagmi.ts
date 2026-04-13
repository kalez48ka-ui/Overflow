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

// All contract interaction goes through useContracts.ts hooks.
// See /src/hooks/useContracts.ts for addresses and ABIs.
