import { type WalletClient } from 'viem';

// ---------------------------------------------------------------------------
// EIP-712 Domain & Types — must match the backend exactly
// ---------------------------------------------------------------------------

const EIP712_DOMAIN = {
  name: 'Overflow',
  version: '1',
  chainId: 92533,
} as const;

const EIP712_TYPES = {
  Action: [
    { name: 'action', type: 'string' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface WalletSignature {
  signature: string;
  nonce: number;
}

/**
 * Signs an EIP-712 typed message proving the caller owns the wallet.
 *
 * @param walletClient - A viem WalletClient (from wagmi's useWalletClient)
 * @param action       - The action label that the backend expects for this
 *                        specific endpoint (e.g. "trade", "fanwar:lock").
 * @returns `{ signature, nonce }` to include in the request body.
 */
export async function signAction(
  walletClient: WalletClient,
  action: string,
): Promise<WalletSignature> {
  const account = walletClient.account;
  if (!account) {
    throw new Error('Wallet not connected');
  }

  const nonce = Date.now();

  const signature = await walletClient.signTypedData({
    account,
    domain: EIP712_DOMAIN,
    types: EIP712_TYPES,
    primaryType: 'Action',
    message: {
      action,
      nonce: BigInt(nonce),
    },
  });

  return { signature, nonce };
}
