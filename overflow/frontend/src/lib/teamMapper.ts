import { PSL_TEAMS } from "@/lib/mockData";
import type { TeamData } from "@/lib/api";
import type { PSLTeam } from "@/types";

/**
 * Maps a backend team API response to the frontend PSLTeam shape.
 * Handles both field naming conventions (currentPrice vs price, priceChange24h vs change24h)
 * and fills in mock color/sparkline data when not available from the API.
 */
export function mapApiTeamToFrontend(t: TeamData): PSLTeam {
  const symbol = t.symbol;
  const mock = PSL_TEAMS.find(
    (m) => m.id === symbol?.replace("$", "") || m.symbol === symbol
  );
  return {
    id: symbol?.replace("$", "") || t.id,
    name: t.name,
    symbol: symbol?.startsWith("$") ? symbol : `$${symbol}`,
    color: mock?.color || "#58A6FF",
    secondaryColor: mock?.secondaryColor || "#1C1C1C",
    price: t.currentPrice ?? t.price,
    change24h: t.priceChange24h ?? t.change24h,
    volume24h: t.volume24h,
    marketCap: t.marketCap,
    sellTax: t.sellTax,
    buyTax: t.buyTax,
    contractAddress: t.contractAddress,
    wins: t.wins,
    losses: t.losses,
    nrr: t.nrr,
    performanceScore: t.performanceScore,
    ranking: t.ranking,
    sparklineData: mock?.sparklineData || [],
  };
}
