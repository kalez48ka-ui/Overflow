import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PriceService } from '../price.service';
import { createMockPrismaClient } from '../../../__mocks__/prisma';
import { SELL_TAX_BY_RANK } from '../../../common/constants';

describe('PriceService', () => {
  let service: PriceService;
  let prisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    service = new PriceService(prisma as any);
  });

  // -------------------------------------------------------------------------
  // calculateBondingCurvePrice
  // -------------------------------------------------------------------------
  describe('calculateBondingCurvePrice', () => {
    // Formula: BASE_PRICE + K * supply^2 * performanceMultiplier
    // where K = 0.0001, BASE_PRICE = 1.0, performanceMultiplier = 0.5 + (performanceScore / 100)

    it('returns base price when supply is 0', () => {
      const price = service.calculateBondingCurvePrice(0, 50);
      expect(price).toBe(1.0);
    });

    it('returns correct price at supply=100 with neutral performance (50)', () => {
      // performanceMultiplier = 0.5 + 50/100 = 1.0
      // price = 1.0 + 0.0001 * 100 * 100 * 1.0 = 1.0 + 1.0 = 2.0
      const price = service.calculateBondingCurvePrice(100, 50);
      expect(price).toBe(2.0);
    });

    it('returns correct price at supply=1000 with neutral performance', () => {
      // price = 1.0 + 0.0001 * 1000 * 1000 * 1.0 = 1.0 + 100 = 101.0
      const price = service.calculateBondingCurvePrice(1000, 50);
      expect(price).toBe(101.0);
    });

    it('returns correct price at supply=10000 with neutral performance', () => {
      // price = 1.0 + 0.0001 * 10000 * 10000 * 1.0 = 1.0 + 10000 = 10001.0
      const price = service.calculateBondingCurvePrice(10000, 50);
      expect(price).toBe(10001.0);
    });

    it('scales price down with low performance score (0)', () => {
      // performanceMultiplier = 0.5 + 0/100 = 0.5
      // price = 1.0 + 0.0001 * 100 * 100 * 0.5 = 1.0 + 0.5 = 1.5
      const price = service.calculateBondingCurvePrice(100, 0);
      expect(price).toBe(1.5);
    });

    it('scales price up with high performance score (100)', () => {
      // performanceMultiplier = 0.5 + 100/100 = 1.5
      // price = 1.0 + 0.0001 * 100 * 100 * 1.5 = 1.0 + 1.5 = 2.5
      const price = service.calculateBondingCurvePrice(100, 100);
      expect(price).toBe(2.5);
    });

    it('price grows quadratically with supply', () => {
      const p1 = service.calculateBondingCurvePrice(100, 50);
      const p2 = service.calculateBondingCurvePrice(200, 50);
      // Difference at 200 vs 100 should be roughly 3x the difference at 100 vs 0
      // because (200^2 - 100^2) = 30000 vs (100^2) = 10000
      expect(p2).toBeGreaterThan(p1);
      expect(p2 - 1.0).toBeCloseTo((p1 - 1.0) * 4, 5); // 200^2 / 100^2 = 4
    });
  });

  // -------------------------------------------------------------------------
  // calculateSellTax
  // -------------------------------------------------------------------------
  describe('calculateSellTax', () => {
    it('returns 2% tax for rank 1 (best team)', () => {
      expect(service.calculateSellTax(1)).toBe(2);
    });

    it('returns 3% tax for rank 2', () => {
      expect(service.calculateSellTax(2)).toBe(3);
    });

    it('returns 5% tax for rank 3', () => {
      expect(service.calculateSellTax(3)).toBe(5);
    });

    it('returns 7% tax for rank 4', () => {
      expect(service.calculateSellTax(4)).toBe(7);
    });

    it('returns 9% tax for rank 5', () => {
      expect(service.calculateSellTax(5)).toBe(9);
    });

    it('returns 12% tax for rank 6', () => {
      expect(service.calculateSellTax(6)).toBe(12);
    });

    it('returns 15% tax for ranks 7 and 8 (worst teams)', () => {
      expect(service.calculateSellTax(7)).toBe(15);
      expect(service.calculateSellTax(8)).toBe(15);
    });

    it('returns default 5% tax for unknown ranking', () => {
      expect(service.calculateSellTax(0)).toBe(5);
      expect(service.calculateSellTax(9)).toBe(5);
      expect(service.calculateSellTax(-1)).toBe(5);
    });
  });

  // -------------------------------------------------------------------------
  // updatePriceAfterTrade — direction / impact
  // -------------------------------------------------------------------------
  describe('updatePriceAfterTrade', () => {
    const teamId = 'team-iu';
    const mockTeam = {
      id: teamId,
      symbol: 'IU',
      currentPrice: 5.0,
      priceChange24h: 0,
    };

    beforeEach(() => {
      (prisma as any).team.findUnique.mockResolvedValue(mockTeam);
      (prisma as any).pricePoint.findFirst.mockResolvedValue(null);
      (prisma as any).team.update.mockResolvedValue({});
      (prisma as any).pricePoint.create.mockResolvedValue({});
    });

    it('BUY increases the price', async () => {
      await service.updatePriceAfterTrade(teamId, 'BUY', 10, 5.0);

      const updateCall = (prisma as any).team.update.mock.calls[0][0];
      const newPrice = updateCall.data.currentPrice;
      // impact = 10 * 0.0001 * 1 = +0.001 => newPrice = 5.001
      expect(newPrice).toBeGreaterThan(5.0);
      expect(newPrice).toBeCloseTo(5.001, 5);
    });

    it('SELL decreases the price', async () => {
      await service.updatePriceAfterTrade(teamId, 'SELL', 10, 5.0);

      const updateCall = (prisma as any).team.update.mock.calls[0][0];
      const newPrice = updateCall.data.currentPrice;
      // impact = 10 * 0.0001 * -1 = -0.001 => newPrice = 4.999
      expect(newPrice).toBeLessThan(5.0);
      expect(newPrice).toBeCloseTo(4.999, 5);
    });

    it('enforces minimum price of 0.01', async () => {
      (prisma as any).team.findUnique.mockResolvedValue({
        ...mockTeam,
        currentPrice: 0.0001,
      });

      await service.updatePriceAfterTrade(teamId, 'SELL', 1000, 1.0);

      const updateCall = (prisma as any).team.update.mock.calls[0][0];
      expect(updateCall.data.currentPrice).toBe(0.01);
    });

    it('does nothing when team is not found', async () => {
      (prisma as any).team.findUnique.mockResolvedValue(null);

      await service.updatePriceAfterTrade(teamId, 'BUY', 10, 5.0);

      expect((prisma as any).team.update).not.toHaveBeenCalled();
    });
  });
});
