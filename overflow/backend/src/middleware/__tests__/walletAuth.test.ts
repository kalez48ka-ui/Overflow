import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// Mock ethers before importing the module under test
vi.mock('ethers', () => ({
  verifyTypedData: vi.fn(),
}));

import { requireWalletAuth } from '../walletAuth';
import { verifyTypedData } from 'ethers';

const mockedVerify = verifyTypedData as unknown as ReturnType<typeof vi.fn>;

function createMockReqRes(body: Record<string, unknown> = {}) {
  const req = {
    body,
  } as unknown as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as NextFunction;

  return { req, res, next };
}

describe('requireWalletAuth middleware', () => {
  const validWallet = '0xE342e5cB60b985ee48E8a44d76b07130D57F5BA8';
  const action = 'trade';
  let middleware: ReturnType<typeof requireWalletAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    middleware = requireWalletAuth(action);
  });

  // -------------------------------------------------------------------------
  // Missing fields
  // -------------------------------------------------------------------------
  it('returns 401 when wallet is missing', async () => {
    const { req, res, next } = createMockReqRes({
      signature: '0xabc',
      nonce: Date.now(),
    });

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid wallet signature' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when signature is missing', async () => {
    const { req, res, next } = createMockReqRes({
      wallet: validWallet,
      nonce: Date.now(),
    });

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when nonce is missing', async () => {
    const { req, res, next } = createMockReqRes({
      wallet: validWallet,
      signature: '0xabc',
    });

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Invalid wallet format
  // -------------------------------------------------------------------------
  it('returns 401 for malformed wallet address', async () => {
    const { req, res, next } = createMockReqRes({
      wallet: 'not-an-address',
      signature: '0xabc',
      nonce: Date.now(),
    });

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Nonce expiry
  // -------------------------------------------------------------------------
  it('returns 401 when nonce is older than 5 minutes', async () => {
    const staleNonce = Date.now() - 6 * 60 * 1000; // 6 minutes ago
    const { req, res, next } = createMockReqRes({
      wallet: validWallet,
      signature: '0xabc',
      nonce: staleNonce,
    });

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when nonce is far in the future (>30s)', async () => {
    const futureNonce = Date.now() + 60_000; // 60s in the future
    const { req, res, next } = createMockReqRes({
      wallet: validWallet,
      signature: '0xabc',
      nonce: futureNonce,
    });

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Signature mismatch
  // -------------------------------------------------------------------------
  it('returns 401 when recovered address does not match wallet', async () => {
    mockedVerify.mockReturnValue('0x0000000000000000000000000000000000000000');

    const { req, res, next } = createMockReqRes({
      wallet: validWallet,
      signature: '0xbadsig',
      nonce: Date.now(),
    });

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Ethers throws (malformed sig, etc.)
  // -------------------------------------------------------------------------
  it('returns 401 when verifyTypedData throws', async () => {
    mockedVerify.mockImplementation(() => {
      throw new Error('invalid signature format');
    });

    const { req, res, next } = createMockReqRes({
      wallet: validWallet,
      signature: '0xgarbage',
      nonce: Date.now(),
    });

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Valid signature
  // -------------------------------------------------------------------------
  it('calls next() and sets verifiedWallet on valid signature', async () => {
    mockedVerify.mockReturnValue(validWallet);

    const { req, res, next } = createMockReqRes({
      wallet: validWallet,
      signature: '0xvalidsignature',
      nonce: Date.now(),
    });

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.verifiedWallet).toBe(validWallet.toLowerCase());
    expect(res.status).not.toHaveBeenCalled();
  });

  it('handles case-insensitive wallet comparison', async () => {
    const upperWallet = validWallet.toUpperCase().replace('0X', '0x');
    // verifyTypedData returns checksummed address
    mockedVerify.mockReturnValue(validWallet);

    const { req, res, next } = createMockReqRes({
      wallet: validWallet.toLowerCase(),
      signature: '0xvalidsig',
      nonce: Date.now(),
    });

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.verifiedWallet).toBe(validWallet.toLowerCase());
  });
});
