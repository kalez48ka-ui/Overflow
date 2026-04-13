"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ChevronDown, Info, Loader2, Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { parseEther, type Address } from "viem";
import type { PSLTeam } from "@/types";
import { cn, formatPrice, formatCurrency } from "@/lib/utils";
import { useBuyTokens, useSellTokens, CONTRACTS } from "@/hooks/useContracts";

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

  // Track real contract tx state
  const contractPending = isBuy ? isBuyPending : isSellPending;
  const contractSuccess = isBuy ? isBuySuccess : isSellSuccess;
  const contractError = isBuy ? isBuyError : isSellError;
  const contractTxHash = isBuy ? buyTxHash : sellTxHash;

  // React to contract hook state changes
  useEffect(() => {
    if (useRealContracts && contractSuccess) {
      setIsLoading(false);
      setTxResult("success");
      setTxHash(contractTxHash ?? null);
      setAmount("");
      const timer = setTimeout(() => {
        setTxResult(null);
        setTxHash(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [contractSuccess, contractTxHash, useRealContracts]);

  useEffect(() => {
    if (useRealContracts && contractError) {
      setIsLoading(false);
      setTxResult("error");
      const timer = setTimeout(() => setTxResult(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [contractError, useRealContracts]);

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

  const quickAmounts = isBuy ? [10, 25, 50, 100] : [1000, 5000, 10000, 25000];

  const handleSubmit = useCallback(async () => {
    if (!numAmount || isLoading) return;

    setTxResult(null);
    setTxHash(null);

    if (useRealContracts) {
      // Use real contract calls
      const tokenAddr = team.contractAddress as Address;

      if (isBuy) {
        buy(tokenAddr, numAmount.toString());
      } else {
        const tokenWei = parseEther(numAmount.toString());
        sell(tokenAddr, tokenWei);
      }
    } else {
      // Fallback: simulate transaction (mock)
      setIsLoading(true);
      await new Promise((r) => setTimeout(r, 2000));
      setIsLoading(false);
      setTxResult("success");
      setTxHash(null);
      setTimeout(() => setTxResult(null), 3000);
      setAmount("");
    }
  }, [numAmount, isLoading, useRealContracts, isBuy, buy, sell, team.contractAddress]);

  return (
    <div className="rounded-xl border border-[#30363D] bg-[#161B22] overflow-hidden">
      {/* Tabs */}
      <div className="grid grid-cols-2 border-b border-[#30363D]">
        {(["buy", "sell"] as TabType[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setAmount(""); setTxResult(null); setTxHash(null); }}
            className={cn(
              "relative py-3.5 text-sm font-semibold capitalize transition-colors",
              tab === t
                ? t === "buy"
                  ? "text-[#3FB950]"
                  : "text-[#F85149]"
                : "text-[#8B949E] hover:text-[#E6EDF3]"
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

      <div className="p-4 space-y-4">
        {/* Wallet connection notice */}
        {!isConnected && (
          <div className="flex items-center gap-2 rounded-lg bg-[#21262D] px-3 py-2.5">
            <Wallet className="h-4 w-4 shrink-0 text-[#58A6FF]" />
            <p className="text-xs text-[#8B949E]">
              <span className="text-[#58A6FF] font-medium">Connect your wallet</span>{" "}
              to trade with real contracts. Demo mode is active.
            </p>
          </div>
        )}

        {/* Tax info banner */}
        <div className="flex items-center gap-2 rounded-lg bg-[#0D1117] px-3 py-2">
          <Info className="h-3.5 w-3.5 shrink-0 text-[#8B949E]" />
          <p className="text-xs text-[#8B949E]">
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
            <label className="text-xs text-[#8B949E]">
              {isBuy ? "Amount (WIRE)" : `Amount (${team.symbol})`}
            </label>
            <span className="text-xs text-[#8B949E]">
              Balance: {isBuy ? "245.80 WIRE" : "12,500 " + team.symbol}
            </span>
          </div>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-[#30363D] bg-[#0D1117] px-3 py-3 pr-16 text-right text-lg font-semibold text-[#E6EDF3] placeholder-[#30363D] outline-none focus:border-[#58A6FF] transition-colors"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <div
                className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ backgroundColor: team.color }}
              >
                {team.id}
              </div>
              <span className="text-xs text-[#8B949E]">{isBuy ? "WIRE" : team.symbol}</span>
            </div>
          </div>
        </div>

        {/* Quick amounts */}
        <div className="grid grid-cols-4 gap-1.5">
          {quickAmounts.map((qa) => (
            <button
              key={qa}
              onClick={() => setAmount(qa.toString())}
              className="rounded-md bg-[#21262D] px-2 py-1.5 text-xs font-medium text-[#8B949E] hover:bg-[#30363D] hover:text-[#E6EDF3] transition-colors"
            >
              {isBuy ? `$${qa}` : qa >= 1000 ? `${qa / 1000}K` : qa}
            </button>
          ))}
        </div>

        {/* Fee breakdown */}
        {numAmount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="rounded-lg border border-[#30363D] bg-[#0D1117] p-3 space-y-2"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8B949E]">Price</span>
              <span className="text-[#E6EDF3]">${formatPrice(team.price)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8B949E]">{taxRate}% Tax</span>
              <span className="text-[#F85149]">-${taxAmount.toFixed(4)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8B949E]">Price Impact</span>
              <span className={cn(priceImpact > 5 ? "text-[#F85149]" : "text-[#8B949E]")}>
                {priceImpact.toFixed(2)}%
                {priceImpact > 5 && (
                  <AlertTriangle className="inline ml-1 h-3 w-3" />
                )}
              </span>
            </div>
            <div className="border-t border-[#30363D] pt-2 flex items-center justify-between text-xs font-semibold">
              <span className="text-[#8B949E]">You receive</span>
              <span className="text-[#E6EDF3]">
                {isBuy
                  ? `${youReceive.toFixed(2)} ${team.symbol}`
                  : `${youReceive.toFixed(4)} WIRE`}
              </span>
            </div>
            {!useRealContracts && (
              <div className="border-t border-[#30363D] pt-2">
                <span className="text-[10px] text-[#8B949E] italic">
                  Simulated trade — contracts not deployed
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!numAmount || isLoading}
          className={cn(
            "w-full rounded-lg py-3.5 text-sm font-bold transition-all",
            isBuy
              ? "bg-[#238636] hover:bg-[#2EA043] text-white disabled:bg-[#21262D] disabled:text-[#8B949E]"
              : "bg-[#DA3633] hover:bg-[#F85149] text-white disabled:bg-[#21262D] disabled:text-[#8B949E]",
            isLoading && "cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {useRealContracts ? "Confirm in wallet..." : "Confirming..."}
            </span>
          ) : (
            `${isBuy ? "Buy" : "Sell"} ${team.symbol}`
          )}
        </button>

        {/* Result */}
        <AnimatePresence>
          {txResult && (
            <motion.div
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
                    <span className="block mt-1 text-[10px] text-[#8B949E] break-all">
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
