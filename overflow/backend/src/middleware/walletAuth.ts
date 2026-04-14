import { Request, Response, NextFunction } from 'express';
import { verifyTypedData } from 'ethers';

// ---------------------------------------------------------------------------
// EIP-712 Domain & Types for Overflow wallet authentication
// ---------------------------------------------------------------------------

const EIP712_DOMAIN = {
  name: 'Overflow',
  version: '1',
  chainId: 92533,
};

/**
 * Minimal EIP-712 typed-data structure used for wallet ownership proof.
 * Every write request includes an `action` string describing the intent
 * and a `nonce` (unix-ms timestamp) to prevent replay.
 */
const EIP712_TYPES = {
  Action: [
    { name: 'action', type: 'string' },
    { name: 'nonce', type: 'uint256' },
  ],
};

/** Maximum allowed age for a nonce (5 minutes in milliseconds). */
const NONCE_MAX_AGE_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Nonce replay protection — in-memory store with periodic cleanup
// ---------------------------------------------------------------------------

// NOTE: In-memory nonce store. Nonces are lost on server restart.
// For production, move to Redis with TTL matching NONCE_MAX_AGE_MS.
/** Map of used nonce values to their timestamp for expiry tracking. */
const usedNonces = new Map<string, number>();

/** Cleanup expired nonces every 5 minutes. */
setInterval(() => {
  const cutoff = Date.now() - NONCE_MAX_AGE_MS;
  for (const [nonce, ts] of usedNonces) {
    if (ts < cutoff) {
      usedNonces.delete(nonce);
    }
  }
}, NONCE_MAX_AGE_MS);

// ---------------------------------------------------------------------------
// Extend Express Request to carry the verified wallet
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Lowercase, checksummed wallet address recovered from EIP-712 signature. */
      verifiedWallet?: string;
      /** Unique request ID for tracing, set by the request-id middleware. */
      requestId?: string;
    }
  }
}

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

/**
 * Express middleware that verifies an EIP-712 wallet signature on POST
 * requests. Expects `wallet`, `signature`, and `nonce` in the JSON body.
 *
 * On success, sets `req.verifiedWallet` to the recovered (lowercased) address.
 * On failure, responds with 401 and a JSON error.
 *
 * @param action - Human-readable action label baked into the signed message
 *                 (e.g. "trade", "fanwar:lock"). This must match what the
 *                 frontend signs so the message cannot be reused across
 *                 different endpoints.
 */
export function requireWalletAuth(action: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { wallet, signature, nonce } = req.body;

      // --- Presence checks ---------------------------------------------------
      if (!wallet || typeof wallet !== 'string') {
        res.status(401).json({ error: 'Invalid wallet signature' });
        return;
      }

      if (!signature || typeof signature !== 'string') {
        res.status(401).json({ error: 'Invalid wallet signature' });
        return;
      }

      if (nonce === undefined || nonce === null) {
        res.status(401).json({ error: 'Invalid wallet signature' });
        return;
      }

      // --- Wallet format -----------------------------------------------------
      const walletStr = wallet.trim();
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletStr)) {
        res.status(401).json({ error: 'Invalid wallet signature' });
        return;
      }

      // --- Nonce freshness ---------------------------------------------------
      const nonceNum = Number(nonce);
      if (!Number.isFinite(nonceNum) || nonceNum <= 0) {
        res.status(401).json({ error: 'Invalid wallet signature' });
        return;
      }

      const age = Date.now() - nonceNum;
      if (age < -30_000 || age > NONCE_MAX_AGE_MS) {
        // Allow 30s clock skew into the future
        res.status(401).json({ error: 'Invalid wallet signature' });
        return;
      }

      // --- Nonce replay protection ------------------------------------------
      const nonceKey = `${walletStr.toLowerCase()}:${nonceNum}`;
      if (usedNonces.has(nonceKey)) {
        res.status(401).json({ error: 'Invalid wallet signature' });
        return;
      }

      // --- EIP-712 recovery --------------------------------------------------
      const recoveredAddress = verifyTypedData(
        EIP712_DOMAIN,
        EIP712_TYPES,
        { action, nonce: BigInt(nonceNum) },
        signature,
      );

      if (recoveredAddress.toLowerCase() !== walletStr.toLowerCase()) {
        res.status(401).json({ error: 'Invalid wallet signature' });
        return;
      }

      // --- Success — record nonce to prevent replay --------------------------
      usedNonces.set(nonceKey, nonceNum);

      // --- Success — attach verified wallet to request -----------------------
      req.verifiedWallet = walletStr.toLowerCase();
      next();
    } catch (err) {
      // Any ethers decoding error, malformed signature, etc.
      console.error('[WalletAuth] Signature verification failed:', err);
      res.status(401).json({ error: 'Invalid wallet signature' });
    }
  };
}
