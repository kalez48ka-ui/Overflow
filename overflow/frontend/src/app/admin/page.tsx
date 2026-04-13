"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Shield,
  Trophy,
  Zap,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { StaggerReveal } from "@/components/motion";
import { api, adminApi } from "@/lib/api";
import type {
  TeamData,
  MatchInfo,
  AdminRankingEntry,
} from "@/lib/api";

// ---------------------------------------------------------------------------
// Token-based auth — password is sent to backend as x-admin-token header
// ---------------------------------------------------------------------------

const TOKEN_STORAGE_KEY = "overflow_admin_token";

function useAdminAuth() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
      // Verify stored token against backend
      localStorage.setItem(TOKEN_STORAGE_KEY, stored);
      adminApi
        .verifyToken()
        .then((valid) => {
          if (valid) {
            setAuthenticated(true);
          } else {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
          }
        })
        .catch(() => {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        })
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  const login = useCallback(async (password: string): Promise<boolean> => {
    // Store token first so adminHeaders() picks it up for the verification call
    localStorage.setItem(TOKEN_STORAGE_KEY, password);
    try {
      const valid = await adminApi.verifyToken();
      if (valid) {
        setAuthenticated(true);
        return true;
      }
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      return false;
    } catch {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAuthenticated(false);
  }, []);

  return { authenticated, checking, login, logout };
}

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  icon: Icon,
  iconColor,
  children,
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${iconColor}20` }}
        >
          <Icon className="h-4 w-4" style={{ color: iconColor }} />
        </div>
        <h2 className="text-sm font-bold text-[#E6EDF3]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[#8B949E]">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-[#30363D] bg-[#0D1117] px-3 py-2 pr-8 text-sm text-[#E6EDF3] outline-none transition focus:border-[#58A6FF] focus:ring-1 focus:ring-[#58A6FF]/30"
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8B949E]" />
      </div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[#8B949E]">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[#30363D] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3] outline-none transition placeholder:text-[#484F58] focus:border-[#58A6FF] focus:ring-1 focus:ring-[#58A6FF]/30"
      />
    </div>
  );
}

function ActionButton({
  onClick,
  loading,
  disabled,
  color,
  children,
}: {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        backgroundColor: loading || disabled ? "#30363D" : color,
      }}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Rankings table
// ---------------------------------------------------------------------------

function RankingsTable({ rankings }: { rankings: AdminRankingEntry[] }) {
  if (rankings.length === 0) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-[#30363D]">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-[#30363D] bg-[#0D1117]">
            <th className="px-3 py-2 font-medium text-[#8B949E]">#</th>
            <th className="px-3 py-2 font-medium text-[#8B949E]">Team</th>
            <th className="px-3 py-2 font-medium text-[#8B949E]">W/L</th>
            <th className="px-3 py-2 font-medium text-[#8B949E]">Score</th>
            <th className="px-3 py-2 font-medium text-[#8B949E]">Price</th>
            <th className="px-3 py-2 font-medium text-[#8B949E]">Sell Tax</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((team, rankIdx) => (
            <motion.tr
              key={team.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: rankIdx * 0.04, duration: 0.25 }}
              className="border-b border-[#30363D]/50 last:border-0"
            >
              <td className="px-3 py-2 font-mono font-bold text-[#FDB913]">
                {team.ranking}
              </td>
              <td className="px-3 py-2">
                <span className="font-semibold text-[#E6EDF3]">
                  {team.name}
                </span>
                <span className="ml-1.5 text-[#8B949E]">${team.symbol}</span>
              </td>
              <td className="px-3 py-2 text-[#C9D1D9]">
                {team.wins}/{team.losses}
              </td>
              <td className="px-3 py-2">
                <span
                  className={
                    team.performanceScore >= 70
                      ? "text-[#3FB950]"
                      : team.performanceScore >= 50
                        ? "text-[#FDB913]"
                        : "text-[#F85149]"
                  }
                >
                  {team.performanceScore}
                </span>
              </td>
              <td className="px-3 py-2 font-mono text-[#E6EDF3]">
                {team.currentPrice.toFixed(4)}
              </td>
              <td className="px-3 py-2 text-[#F85149]">
                {team.sellTaxRate}%
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upset tier preview
// ---------------------------------------------------------------------------

function getUpsetTier(score: number): {
  tier: string;
  multiplier: number;
  color: string;
} {
  if (score >= 80) return { tier: "LEGENDARY", multiplier: 5, color: "#FDB913" };
  if (score >= 60) return { tier: "EPIC", multiplier: 4, color: "#6A0DAD" };
  if (score >= 40) return { tier: "MAJOR", multiplier: 3, color: "#E4002B" };
  if (score >= 20) return { tier: "MODERATE", multiplier: 2, color: "#58A6FF" };
  return { tier: "MINOR", multiplier: 1, color: "#8B949E" };
}

// ---------------------------------------------------------------------------
// Login gate
// ---------------------------------------------------------------------------

function LoginGate({ onLogin }: { onLogin: (pw: string) => Promise<boolean> }) {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const ok = await onLogin(password);
      if (!ok) {
        setError(true);
        setTimeout(() => setError(false), 2000);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-[#30363D] bg-[#161B22] p-6"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E4002B]/15">
            <Lock className="h-4.5 w-4.5 text-[#E4002B]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#E6EDF3]">
              Admin Panel
            </h1>
            <p className="text-xs text-[#8B949E]">
              Oracle + Vault control for hackathon demo
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#8B949E]">
            Password
          </label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              autoFocus
              className={`w-full rounded-lg border px-3 py-2.5 pr-10 text-sm text-[#E6EDF3] outline-none transition placeholder:text-[#484F58] focus:ring-1 ${
                error
                  ? "border-[#F85149] bg-[#F85149]/10 focus:ring-[#F85149]/30"
                  : "border-[#30363D] bg-[#0D1117] focus:border-[#58A6FF] focus:ring-[#58A6FF]/30"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8B949E] hover:text-[#E6EDF3]"
            >
              {showPw ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {error && (
            <p className="text-xs text-[#F85149]">Invalid password</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-[#E4002B] py-2.5 text-sm font-semibold text-white transition hover:bg-[#C80025] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Verifying..." : "Authenticate"}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 1: Submit Match Result
// ---------------------------------------------------------------------------

function MatchResultSection({
  teams,
  matches,
}: {
  teams: TeamData[];
  matches: MatchInfo[];
}) {
  const [matchId, setMatchId] = useState("");
  const [winnerId, setWinnerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [rankings, setRankings] = useState<AdminRankingEntry[]>([]);

  const teamOptions = useMemo(
    () =>
      teams.map((t) => ({
        value: t.id,
        label: `${t.name} (${t.symbol})`,
      })),
    [teams],
  );

  const matchOptions = useMemo(
    () =>
      matches.map((m) => ({
        value: m.id,
        label: `${m.team1Name} vs ${m.team2Name} (${m.status})`,
      })),
    [matches],
  );

  // When match is selected, figure out valid winner options
  const selectedMatch = matches.find((m) => m.id === matchId);
  const winnerOptions = selectedMatch
    ? [
        { value: selectedMatch.team1Id, label: selectedMatch.team1Name },
        { value: selectedMatch.team2Id, label: selectedMatch.team2Name },
      ]
    : teamOptions;

  async function handleSubmit() {
    if (!matchId || !winnerId) {
      toast.error("Select a match and winner");
      return;
    }
    setLoading(true);
    try {
      const result = await adminApi.submitMatchResult(matchId, winnerId);
      setRankings(result.rankings);

      const isUpset = result.match.isUpset;
      if (isUpset) {
        toast.success(
          `Match result submitted — UPSET detected! Score: ${result.match.upsetScore}`,
        );
      } else {
        toast.success("Match result submitted — rankings updated");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCard title="Submit Match Result" icon={Trophy} iconColor="#FDB913">
      <div className="space-y-3">
        <SelectField
          label="Match"
          value={matchId}
          onChange={(v) => {
            setMatchId(v);
            setWinnerId("");
          }}
          options={matchOptions}
          placeholder="Select a match..."
        />
        <SelectField
          label="Winner"
          value={winnerId}
          onChange={setWinnerId}
          options={winnerOptions}
          placeholder="Select the winning team..."
        />
        <ActionButton
          onClick={handleSubmit}
          loading={loading}
          disabled={!matchId || !winnerId}
          color="#FDB913"
        >
          Submit Result
        </ActionButton>
      </div>
      <RankingsTable rankings={rankings} />
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Section 2: Trigger Upset
// ---------------------------------------------------------------------------

function TriggerUpsetSection({
  teams,
  matches,
}: {
  teams: TeamData[];
  matches: MatchInfo[];
}) {
  const [matchId, setMatchId] = useState("");
  const [winnerSymbol, setWinnerSymbol] = useState("");
  const [loserSymbol, setLoserSymbol] = useState("");
  const [upsetScore, setUpsetScore] = useState("40");
  const [loading, setLoading] = useState(false);

  const teamSymbolOptions = useMemo(
    () =>
      teams.map((t) => ({
        value: t.symbol.replace(/^\$/, ""),
        label: `${t.name} (${t.symbol})`,
      })),
    [teams],
  );

  const matchOptions = useMemo(
    () =>
      matches.map((m) => ({
        value: m.id,
        label: `${m.team1Name} vs ${m.team2Name}`,
      })),
    [matches],
  );

  const score = Number(upsetScore) || 0;
  const preview = getUpsetTier(score);
  const releasePercent = Math.min(50, score * 0.5 * preview.multiplier);

  async function handleTrigger() {
    if (!matchId || !winnerSymbol || !loserSymbol) {
      toast.error("Fill all fields");
      return;
    }
    if (winnerSymbol === loserSymbol) {
      toast.error("Winner and loser must be different teams");
      return;
    }
    setLoading(true);
    try {
      const result = await adminApi.triggerUpset(
        matchId,
        winnerSymbol,
        loserSymbol,
        score,
      );
      const u = result.upset;
      toast.success(
        `Upset triggered! ${u.released.toFixed(2)} WIRE released from vault`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCard
      title="Trigger Upset"
      icon={Zap}
      iconColor="#E4002B"
    >
      <div className="space-y-3">
        <SelectField
          label="Match"
          value={matchId}
          onChange={setMatchId}
          options={matchOptions}
          placeholder="Select a match..."
        />
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Winner"
            value={winnerSymbol}
            onChange={setWinnerSymbol}
            options={teamSymbolOptions}
            placeholder="Winner..."
          />
          <SelectField
            label="Loser"
            value={loserSymbol}
            onChange={setLoserSymbol}
            options={teamSymbolOptions}
            placeholder="Loser..."
          />
        </div>
        <NumberInput
          label="Upset Score"
          value={upsetScore}
          onChange={setUpsetScore}
          min={0}
          max={130}
          step={1}
          placeholder="0-130"
        />

        {/* Upset preview */}
        {score > 0 && (
          <div
            className="rounded-lg border px-3 py-2.5 text-xs"
            style={{
              borderColor: `${preview.color}40`,
              backgroundColor: `${preview.color}10`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[#8B949E]">Tier</span>
              <span className="font-bold" style={{ color: preview.color }}>
                {preview.tier}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[#8B949E]">Multiplier</span>
              <span className="font-mono text-[#E6EDF3]">
                {preview.multiplier}x
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[#8B949E]">Vault Release</span>
              <span className="font-mono text-[#3FB950]">
                {releasePercent.toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        <ActionButton
          onClick={handleTrigger}
          loading={loading}
          disabled={!matchId || !winnerSymbol || !loserSymbol || score <= 0}
          color="#E4002B"
        >
          Trigger Upset
        </ActionButton>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Section 3: Recalculate Rankings
// ---------------------------------------------------------------------------

function RecalculateSection() {
  const [loading, setLoading] = useState(false);
  const [rankings, setRankings] = useState<AdminRankingEntry[]>([]);

  async function handleRecalculate() {
    setLoading(true);
    try {
      const result = await adminApi.recalculateRankings();
      setRankings(result.rankings);
      toast.success("Rankings recalculated successfully");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCard
      title="Recalculate Rankings"
      icon={RefreshCw}
      iconColor="#58A6FF"
    >
      <p className="mb-3 text-xs leading-relaxed text-[#8B949E]">
        Re-sorts all teams by wins, NRR, and performance score. Updates sell
        taxes based on new ranking positions.
      </p>
      <ActionButton onClick={handleRecalculate} loading={loading} color="#58A6FF">
        Recalculate
      </ActionButton>
      <RankingsTable rankings={rankings} />
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Section 4: Manual Price Update
// ---------------------------------------------------------------------------

function PriceUpdateSection({ teams }: { teams: TeamData[] }) {
  const [teamSymbol, setTeamSymbol] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    name: string;
    oldPrice: number;
    newPrice: number;
    change24h: number;
  } | null>(null);

  const teamOptions = useMemo(
    () =>
      teams.map((t) => ({
        value: t.symbol.replace(/^\$/, ""),
        label: `${t.name} (${t.symbol}) — ${t.price.toFixed(4)} WIRE`,
      })),
    [teams],
  );

  async function handleUpdate() {
    if (!teamSymbol || !newPrice) {
      toast.error("Select a team and enter a price");
      return;
    }
    const price = Number(newPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Price must be a positive number");
      return;
    }
    setLoading(true);
    try {
      const res = await adminApi.updatePrice(teamSymbol, price);
      setResult({
        name: res.team.name,
        oldPrice: res.team.oldPrice,
        newPrice: res.team.newPrice,
        change24h: res.team.change24h,
      });
      toast.success(`${res.team.name} price updated to ${res.team.newPrice.toFixed(4)} WIRE`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCard
      title="Manual Price Update"
      icon={DollarSign}
      iconColor="#3FB950"
    >
      <div className="space-y-3">
        <SelectField
          label="Team"
          value={teamSymbol}
          onChange={setTeamSymbol}
          options={teamOptions}
          placeholder="Select a team..."
        />
        <NumberInput
          label="New Price (WIRE)"
          value={newPrice}
          onChange={setNewPrice}
          min={0.0001}
          step={0.001}
          placeholder="e.g. 0.0850"
        />
        <ActionButton
          onClick={handleUpdate}
          loading={loading}
          disabled={!teamSymbol || !newPrice}
          color="#3FB950"
        >
          Update Price
        </ActionButton>

        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="mt-2 rounded-lg border border-[#30363D] bg-[#0D1117] p-3 text-xs"
          >
            <p className="font-semibold text-[#E6EDF3]">{result.name}</p>
            <div className="mt-1.5 flex items-center gap-3">
              <span className="text-[#8B949E]">
                {result.oldPrice.toFixed(4)}
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#8B949E]" />
              <span className="font-mono font-bold text-[#E6EDF3]">
                {result.newPrice.toFixed(4)}
              </span>
              <span
                className={`ml-auto font-mono ${
                  result.change24h >= 0
                    ? "text-[#3FB950]"
                    : "text-[#F85149]"
                }`}
              >
                {result.change24h >= 0 ? "+" : ""}
                {result.change24h.toFixed(2)}%
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminPage() {
  const { authenticated, checking, login, logout } = useAdminAuth();
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!authenticated) return;

    async function loadData() {
      try {
        const [teamsData, matchesData] = await Promise.all([
          api.teams.getAll(),
          api.matches.getAll(),
        ]);
        setTeams(teamsData);
        setMatches(matchesData);
      } catch (err) {
        console.error("[AdminPage] Failed to load data:", err);
        toast.error("Failed to load teams/matches data");
      } finally {
        setDataLoading(false);
      }
    }

    loadData();
  }, [authenticated]);

  if (checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#58A6FF]" />
      </div>
    );
  }

  if (!authenticated) {
    return <LoginGate onLogin={login} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6"
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#E4002B] to-[#8B0019]">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-[#E6EDF3]">
              Oracle Panel
            </h1>
            <p className="text-xs text-[#8B949E]">
              Match results, upsets, rankings, and price control
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="rounded-lg border border-[#30363D] bg-[#21262D] px-3 py-1.5 text-xs font-medium text-[#8B949E] transition hover:border-[#F85149]/40 hover:text-[#F85149]"
        >
          Sign Out
        </button>
      </div>

      {/* Warning banner */}
      <div className="mb-6 flex items-center gap-2 rounded-lg border border-[#FDB913]/30 bg-[#FDB913]/10 px-4 py-2.5">
        <AlertTriangle className="h-4 w-4 shrink-0 text-[#FDB913]" />
        <p className="text-xs text-[#FDB913]">
          These actions modify live platform state. Use during hackathon demo
          to show the oracle-to-payout pipeline.
        </p>
      </div>

      {dataLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#58A6FF]" />
        </div>
      ) : (
        <StaggerReveal className="grid gap-5 lg:grid-cols-2" staggerDelay={0.1} yOffset={20}>
          <MatchResultSection teams={teams} matches={matches} />
          <TriggerUpsetSection teams={teams} matches={matches} />
          <RecalculateSection />
          <PriceUpdateSection teams={teams} />
        </StaggerReveal>
      )}
    </motion.div>
  );
}
