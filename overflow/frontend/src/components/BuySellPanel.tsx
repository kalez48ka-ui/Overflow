"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ChevronDown, Info, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useAccount, useBalance } from "wagmi";
import { parseEther, type Address } from "viem";
import type { PSLTeam } from "@/types";
import { cn, formatPrice, formatCurrency } from "@/lib/utils";
import { MovingBorderButton } from "@/components/ui/moving-border";
import { useBuyTokens, useSellTokens, useEstimateSellProceeds, CONTRACTS } from "@/hooks/useContracts";

interface BuySellPanelProps {
  team: PSLTeam;
}

type TabType = "buy" | "sell";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/** Returns true when contracts are actually deployed (non-zero factory address). */
function areContractsDeployed(): boolean {
  return (
    CONTRACTS.factory !== ZERO_ADDRESS &&
    CONTRACTS.factory !== ("0x0000000000000000000000000000000000000000" as Address)
  );
}

export function BuySellPanel({ team }: BuySellPanelProps) {
  const [tab, setTab] = useState<TabType>("buy");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [txResult, setTxResult] = useState<"success" | "error" | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { isConnected, address } = useAccount();
  const { data: walletBalance } = useBalance({ address });

  // Real contract hooks
  const {
    buy,
    isPending: isBuyPending,
    isSuccess: isBuySuccess,
    isError: isBuyError,
    error: buyError,
    txHash: buyTxHash,
  } = useBuyTokens();

  const {
    sell,
    isPending: isSellPending,
    isSuccess: isSellSuccess,
    isError: isSellError,
    error: sellError,
    txHash: sellTxHash,
  } = useSellTokens();

  const numAmount = parseFloat(amount) || 0;
  const isBuy = tab === "buy";
  const useRealContracts = isConnected && areContractsDeployed();

  // Track the active tab at submission time to avoid stale closure in tx callbacks
  const submittedTabRef = useRef<TabType>("buy");

  // Estimate sell proceeds on-chain to enforce slippage protection
  const tokenAddr = team.contractAddress as Address;
  const sellTokenWei = !isBuy && numAmount > 0 ? parseEther(numAmount.toString()) : undefined;
  const { estimatedProceeds: sellEstimate, isLoading: isSellEstimateLoading } =
    useEstimateSellProceeds(
      !isBuy ? tokenAddr : undefined,
      sellTokenWei,
    );

  // Track real contract tx state
  const contractPending = isBuy ? isBuyPending : isSellPending;
  const contractSuccess = isBuy ? isBuySuccess : isSellSuccess;
  const contractError = isBuy ? isBuyError : isSellError;
  const contractTxHash = isBuy ? buyTxHash : sellTxHash;

  // React to contract hook state changes
  useEffect(() => {
    if (useRealContracts && contractSuccess) {
      const wasBuy = submittedTabRef.current === "buy";
      setIsLoading(false);
      setTxResult("success");
      setTxHash(contractTxHash ?? null);
      setAmount("");
      toast.success(
        `${wasBuy ? "Buy" : "Sell"} order for ${team.symbol} submitted`,
        {
          description: contractTxHash
            ? `Tx: ${contractTxHash.slice(0, 10)}...${contractTxHash.slice(-6)}`
            : "Transaction confirmed on-chain",
        },
      );
      const timer = setTimeout(() => {
        setTxResult(null);
        setTxHash(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [contractSuccess, contractTxHash, useRealContracts, team.symbol]);

  useEffect(() => {
    if (useRealContracts && contractError) {
      const wasBuy = submittedTabRef.current === "buy";
      setIsLoading(false);
      setTxResult("error");
      const errorMsg = (buyError || sellError)?.message?.slice(0, 120) || "Unknown error";
      toast.error(
        `${wasBuy ? "Buy" : "Sell"} order for ${team.symbol} failed`,
        { description: errorMsg },
      );
      const timer = setTimeout(() => setTxResult(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [contractError, useRealContracts, team.symbol, buyError, sellError]);

  useEffect(() => {
    if (useRealContracts) {
      setIsLoading(contractPending);
    }
  }, [contractPending, useRealContracts]);

  // For buy: amount is in USD, get tokens
  // For sell: amount is in tokens, get USD
  const wireAmount = isBuy ? numAmount : numAmount * team.price;
  const tokenAmount = isBuy ? numAmount / team.price : numAmount;
  const taxRate = isBuy ? team.buyTax : team.sellTax;
  const taxAmount = wireAmount * (taxRate / 100);
  const priceImpact = Math.min((numAmount / (team.volume24h * 0.1)) * 100, 15);
  const youReceive = isBuy
    ? tokenAmount * (1 - taxRate / 100)
    : (wireAmount - taxAmount);

  const quickAmounts = isBuy ? [0.5, 1, 5, 10] : [1000, 5000, 10000, 25000];

  const handleSubmit = useCallback(async () => {
    if (!numAmount || isLoading) return;

    setTxResult(null);
    setTxHash(null);
    submittedTabRef.current = tab;

    if (useRealContracts) {
      // Use real contract calls
      if (isBuy) {
        // 3% default slippage; no on-chain estimate available here so
        // the hook falls back to inputWei * (1 - slippage) as a floor.
        buy(tokenAddr, numAmount.toString(), undefined, 300);
      } else {
        const tokenWei = parseEther(numAmount.toString());
        if (!sellEstimate || sellEstimate <= BigInt(0)) {
          toast.error("Cannot sell: price estimate unavailable. Try again shortly.");
          return;
        }
        sell(tokenAddr, tokenWei, sellEstimate, 300);
      }
    } else {
      // Fallback: simulate transaction (mock)
      setIsLoading(true);
      await new Promise((r) => setTimeout(r, 2000));
      setIsLoading(false);
      setTxResult("success");
      setTxHash(null);
      toast.success(
        `${isBuy ? "Bought" : "Sold"} ${team.symbol} (demo mode)`,
        { description: `${numAmount} ${isBuy ? "WIRE" : team.symbol} — simulated trade` },
      );
      setTimeout(() => setTxResult(null), 3000);
      setAmount("");
    }
  }, [numAmount, isLoading, useRealContracts, isBuy, buy, sell, tokenAddr, sellEstimate, team.symbol]);

  return (
    <div className="rounded-xl border border-[#21262D] bg-[#161B22] overflow-hidden">
      {/* Tabs */}
      <div className="grid grid-cols-2 border-b border-[#21262D]" role="tablist" aria-label="Trade type">
        {(["buy", "sell"] as TabType[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            aria-controls={`buysell-tabpanel-${t}`}
            id={`buysell-tab-${t}`}
            onClick={() => { setTab(t); setAmount(""); setTxResult(null); setTxHash(null); }}
            className={cn(
              "relative py-3.5 text-sm font-semibold capitalize transition-colors",
              tab === t
                ? t === "buy"
                  ? "text-[#3FB950]"
                  : "text-[#F85149]"
                : "text-[#9CA3AF] hover:text-[#E6EDF3]"
            )}
          >
            {t}
            {tab === t && (
              <motion.div
                layoutId="tab-indicator"
                className={cn(
                  "absolute bottom-0 left-0 right-0 h-0.5",
                  t === "buy" ? "bg-[#3FB950]" : "bg-[#F85149]"
                )}
              />
            )}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4" role="tabpanel" id={`buysell-tabpanel-${tab}`} aria-label={`${tab} ${team.symbol}`}>
        {/* Wallet connection notice */}
        {!isConnected && (
          <div className="flex items-center gap-2 rounded-lg bg-[#21262D] px-3 py-2.5">
            <Wallet className="h-4 w-4 shrink-0 text-[#58A6FF]" />
            <p className="text-xs text-[#9CA3AF]">
              <span className="text-[#58A6FF] font-medium">Connect your wallet</span>{" "}
              to trade with real contracts. Demo mode is active.
            </p>
          </div>
        )}

        {/* Tax info banner */}
        <div className="flex items-center gap-2 rounded-lg bg-[#0D1117] px-3 py-2">
          <Info className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" />
          <p className="text-xs text-[#9CA3AF]">
            Current {isBuy ? "buy" : "sell"} tax:{" "}
            <span className={cn("font-semibold", isBuy ? "text-[#3FB950]" : "text-[#F85149]")}>
              {taxRate}%
            </span>{" "}
            — reflects {team.name} performance score
          </p>
        </div>

        {/* Amount input */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="trade-amount" className="text-xs text-[#9CA3AF]">
              {isBuy ? "Amount (WIRE)" : `Amount (${team.symbol})`}
            </label>
            <span className="text-xs text-[#9CA3AF]">
              Balance:{" "}
              {isConnected && walletBalance
                ? isBuy
                  ? `${parseFloat(walletBalance.formatted).toFixed(4)} ${walletBalance.symbol}`
                  : "—"
                : "—"}
            </span>
          </div>
          <div className="relative">
            <input
              id="trade-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              maxLength={20}
              placeholder="0.00"
              className="w-full rounded-lg border border-[#21262D] bg-[#0D1117] px-3 py-3 pr-16 text-right text-lg font-semibold text-[#E6EDF3] placeholder-[#768390] outline-none focus:border-[#58A6FF] focus:ring-1 focus:ring-[#58A6FF]/30 transition-colors duration-150"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <div
                className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ backgroundColor: team.color }}
              >
                {team.id}
              </div>
              <span className="text-xs text-[#9CA3AF]">{isBuy ? "WIRE" : team.symbol}</span>
            </div>
          </div>
        </div>

        {/* Quick amounts */}
        <div className="grid grid-cols-4 gap-1.5">
          {quickAmounts.map((qa) => (
            <button
              key={qa}
              onClick={() => setAmount(qa.toString())}
              aria-label={`Set amount to ${qa} ${isBuy ? 'WIRE' : team.symbol}`}
              className="rounded-md bg-[#21262D] px-2 py-2 min-h-[44px] sm:min-h-0 sm:py-1.5 text-xs font-medium text-[#9CA3AF] hover:bg-[#21262D]/80 hover:text-[#E6EDF3] transition-colors"
            >
              {isBuy ? qa : qa >= 1000 ? `${qa / 1000}K` : qa}
            </button>
          ))}
        </div>

        {/* Fee breakdown */}
        {numAmount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="rounded-lg border border-[#21262D] bg-[#0D1117] p-3 space-y-2"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#9CA3AF]">Price</span>
              <span className="text-[#E6EDF3]">${formatPrice(team.price)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#9CA3AF]">{taxRate}% Tax</span>
              <span className="text-[#F85149]">-${taxAmount.toFixed(4)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#9CA3AF]">Price Impact</span>
              <span className={cn(priceImpact > 5 ? "text-[#F85149]" : "text-[#9CA3AF]")}>
                {priceImpact.toFixed(2)}%
                {priceImpact > 5 && (
                  <AlertTriangle className="inline ml-1 h-3 w-3" />
                )}
              </span>
            </div>
            <div className="border-t border-[#21262D] pt-2 flex items-center justify-between text-xs font-semibold">
              <span className="text-[#9CA3AF]">You receive</span>
              <span className="text-[#E6EDF3]">
                {isBuy
                  ? `${youReceive.toFixed(2)} ${team.symbol}`
                  : `${youReceive.toFixed(4)} WIRE`}
              </span>
            </div>
            {!useRealContracts && (
              <div className="border-t border-[#21262D] pt-2">
                <span className="text-[10px] text-[#9CA3AF] italic">
                  Simulated trade — contracts not deployed
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Submit */}
        <MovingBorderButton
          as="button"
          onClick={handleSubmit}
          disabled={!numAmount || isLoading || (!isBuy && useRealContracts && isSellEstimateLoading)}
          borderRadius="0.5rem"
          containerClassName="w-full"
          className={cn(
            "w-full py-3.5 text-sm font-bold transition-all duration-150",
            isBuy
              ? "bg-[#238636] text-white"
              : "bg-[#DA3633] text-white",
            (!numAmount || isLoading) && "opacity-50 cursor-not-allowed"
          )}
          borderClassName={isBuy
            ? "bg-[conic-gradient(from_90deg_at_50%_50%,#21262D_0%,#3FB950_50%,#21262D_100%)]"
            : "bg-[conic-gradient(from_90deg_at_50%_50%,#21262D_0%,#F85149_50%,#21262D_100%)]"
          }
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {useRealContracts ? "Confirm in wallet..." : "Confirming..."}
            </span>
          ) : (
            `${isBuy ? "Buy" : "Sell"} ${team.symbol}`
          )}
        </MovingBorderButton>

        {/* Result */}
        <AnimatePresence>
          {txResult && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                "rounded-lg px-3 py-2 text-center text-xs font-medium",
                txResult === "success"
                  ? "bg-[#1C4A2A] text-[#3FB950]"
                  : "bg-[#4A1C1C] text-[#F85149]"
              )}
            >
              {txResult === "success" ? (
                <>
                  Transaction submitted! {isBuy ? "Buying" : "Selling"} {team.symbol}
                  {txHash && (
                    <span className="block mt-1 text-[10px] text-[#9CA3AF] break-all">
                      Tx: {txHash}
                    </span>
                  )}
                </>
              ) : (
                <>
                  Transaction failed. Please try again.
                  {(buyError || sellError) && (
                    <span className="block mt-1 text-[10px] text-[#F85149] break-all">
                      {(buyError || sellError)?.message?.slice(0, 120)}
                    </span>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
