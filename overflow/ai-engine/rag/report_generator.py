"""
Overflow AI Engine — Pre-Match Report Generator.

Takes two team symbols and produces a structured, compelling pre-match analysis
report suitable for display on the Overflow frontend.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import (
    SYMBOL_TO_TEAM,
    resolve_team_name,
    resolve_team_symbol,
    trading_context,
)
from rag.pipeline import OverflowRAG
from rag.vector_store import VectorStore

logger = logging.getLogger(__name__)


class ReportGenerator:
    """Generate structured pre-match analysis reports for Overflow."""

    def __init__(self, rag: OverflowRAG | None = None) -> None:
        self._rag = rag or OverflowRAG()

    # ── public API ─────────────────────────────────────────────────────

    def generate(
        self,
        home_symbol: str,
        away_symbol: str,
        venue: str | None = None,
    ) -> dict[str, Any]:
        """Generate a full pre-match report.

        Args:
            home_symbol: Home team symbol (e.g. "IU").
            away_symbol: Away team symbol (e.g. "QG").
            venue: Optional venue override.

        Returns:
            Dict with ``report`` (Markdown string), ``metadata``, and ``trading``.
        """
        home_symbol = resolve_team_symbol(home_symbol)
        away_symbol = resolve_team_symbol(away_symbol)
        home_name = resolve_team_name(home_symbol)
        away_name = resolve_team_name(away_symbol)

        logger.info("Generating pre-match report: %s vs %s", home_symbol, away_symbol)

        # Gather context
        rank_home = trading_context.get_ranking(home_symbol)
        rank_away = trading_context.get_ranking(away_symbol)
        h2h = self._get_head_to_head(home_symbol, away_symbol)
        venue_str = venue or self._infer_venue(home_symbol)

        # Determine favorite / underdog
        home_rank = rank_home.rank if rank_home else 3
        away_rank = rank_away.rank if rank_away else 3
        fav_sym = home_symbol if home_rank <= away_rank else away_symbol
        dog_sym = away_symbol if fav_sym == home_symbol else home_symbol
        fav_name = resolve_team_name(fav_sym)
        dog_name = resolve_team_name(dog_sym)

        # Use RAG to generate the analytical core
        rag_result = self._rag.analyze_matchup(home_symbol, away_symbol)

        # Compute trading metrics
        upset_prob = self._estimate_upset_probability(fav_sym, dog_sym, h2h)
        vault_payout = self._estimate_vault_payout(upset_prob)

        # Build structured report
        report = self._assemble_report(
            home_symbol=home_symbol,
            away_symbol=away_symbol,
            home_name=home_name,
            away_name=away_name,
            venue=venue_str,
            rank_home=rank_home,
            rank_away=rank_away,
            h2h=h2h,
            rag_analysis=rag_result["answer"],
            fav_sym=fav_sym,
            dog_sym=dog_sym,
            fav_name=fav_name,
            dog_name=dog_name,
            upset_prob=upset_prob,
            vault_payout=vault_payout,
        )

        return {
            "report": report,
            "metadata": {
                "home_team": home_symbol,
                "away_team": away_symbol,
                "venue": venue_str,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "model": rag_result.get("model", "unknown"),
                "fallback": rag_result.get("fallback", False),
            },
            "trading": {
                "favorite": fav_sym,
                "underdog": dog_sym,
                "upset_probability": round(upset_prob * 100, 1),
                "estimated_vault_payout": round(vault_payout, 2),
                "risk_level": self._risk_level(upset_prob),
                "home_sell_tax": rank_home.sell_tax_pct if rank_home else 0.0,
                "away_sell_tax": rank_away.sell_tax_pct if rank_away else 0.0,
            },
        }

    # ── internal helpers ───────────────────────────────────────────────

    def _get_head_to_head(self, sym_a: str, sym_b: str) -> dict[str, Any]:
        """Retrieve head-to-head record from the vector store."""
        team_a = resolve_team_name(sym_a)
        team_b = resolve_team_name(sym_b)

        query = f"{team_a} vs {team_b} PSL head to head"
        docs = self._rag.vector_store.query("matches", query, n_results=10)

        # Count wins from retrieved matches
        wins_a = 0
        wins_b = 0
        matches_found = 0
        recent_results: list[str] = []

        for doc in docs:
            meta = doc.get("metadata", {})
            text = doc.get("text", "")
            # Check if both teams are involved
            if (sym_a in text or team_a in text) and (sym_b in text or team_b in text):
                matches_found += 1
                winner = meta.get("winner", "")
                if team_a in winner or sym_a in winner:
                    wins_a += 1
                    recent_results.append(sym_a)
                elif team_b in winner or sym_b in winner:
                    wins_b += 1
                    recent_results.append(sym_b)
                else:
                    recent_results.append("NR")

        return {
            "total_matches": matches_found,
            f"{sym_a}_wins": wins_a,
            f"{sym_b}_wins": wins_b,
            "no_results": matches_found - wins_a - wins_b,
            "recent_results": recent_results[:5],
        }

    def _infer_venue(self, home_symbol: str) -> str:
        """Infer venue from home team symbol."""
        venue_map = {
            "IU": "Rawalpindi Cricket Stadium, Rawalpindi",
            "KK": "National Stadium, Karachi",
            "LQ": "Gaddafi Stadium, Lahore",
            "MS": "Multan Cricket Stadium, Multan",
            "PZ": "Arbab Niaz Stadium, Peshawar",
            "QG": "National Stadium, Karachi",
            "HK": "Niaz Stadium, Hyderabad",
            "RW": "Rawalpindi Cricket Stadium, Rawalpindi",
        }
        return venue_map.get(home_symbol, "National Stadium, Karachi")

    def _estimate_upset_probability(
        self,
        fav_sym: str,
        dog_sym: str,
        h2h: dict[str, Any],
    ) -> float:
        """Estimate upset probability based on rankings and H2H data."""
        fav_rank = trading_context.get_ranking(fav_sym)
        dog_rank = trading_context.get_ranking(dog_sym)

        if not fav_rank or not dog_rank:
            return 0.35  # default

        rank_diff = abs(fav_rank.rank - dog_rank.rank)

        # Base upset probability from rank difference
        base_prob = max(0.15, 0.50 - rank_diff * 0.07)

        # Adjust by H2H record
        dog_wins = h2h.get(f"{dog_sym}_wins", 0)
        total = h2h.get("total_matches", 0)
        if total > 0:
            h2h_factor = dog_wins / total
            base_prob = base_prob * 0.6 + h2h_factor * 0.4

        # Adjust by recent form
        fav_form = fav_rank.recent_form.split()
        dog_form = dog_rank.recent_form.split()
        fav_recent_wins = sum(1 for r in fav_form[-3:] if r == "W")
        dog_recent_wins = sum(1 for r in dog_form[-3:] if r == "W")

        form_adjustment = (dog_recent_wins - fav_recent_wins) * 0.03
        base_prob = max(0.10, min(0.65, base_prob + form_adjustment))

        return base_prob

    def _estimate_vault_payout(self, upset_prob: float) -> float:
        """Estimate per-token Upset Vault payout if upset occurs."""
        vault = trading_context.upset_vault_wire
        # Simplified: assume ~1000 underdog token holders
        estimated_holders = 1000
        payout_per_holder = vault / estimated_holders
        expected_value = payout_per_holder * upset_prob
        return expected_value

    def _risk_level(self, upset_prob: float) -> str:
        """Map upset probability to risk level."""
        if upset_prob < 0.25:
            return "LOW"
        if upset_prob < 0.45:
            return "MEDIUM"
        return "HIGH"

    def _assemble_report(
        self,
        *,
        home_symbol: str,
        away_symbol: str,
        home_name: str,
        away_name: str,
        venue: str,
        rank_home: Any,
        rank_away: Any,
        h2h: dict[str, Any],
        rag_analysis: str,
        fav_sym: str,
        dog_sym: str,
        fav_name: str,
        dog_name: str,
        upset_prob: float,
        vault_payout: float,
    ) -> str:
        """Assemble the final Markdown report."""
        home_rank_str = f"#{rank_home.rank}" if rank_home else "N/A"
        away_rank_str = f"#{rank_away.rank}" if rank_away else "N/A"
        home_tax = f"{rank_home.sell_tax_pct}%" if rank_home else "N/A"
        away_tax = f"{rank_away.sell_tax_pct}%" if rank_away else "N/A"
        home_form = rank_home.recent_form if rank_home else "N/A"
        away_form = rank_away.recent_form if rank_away else "N/A"

        h2h_home_wins = h2h.get(f"{home_symbol}_wins", 0)
        h2h_away_wins = h2h.get(f"{away_symbol}_wins", 0)
        h2h_total = h2h.get("total_matches", 0)
        h2h_nr = h2h.get("no_results", 0)

        risk = self._risk_level(upset_prob)
        upset_pct = round(upset_prob * 100, 1)
        vault_balance = trading_context.upset_vault_wire

        report = f"""## Overflow AI Pre-Match Analysis
### {home_name} (${home_symbol}) vs {away_name} (${away_symbol})

---

**Match Context:**

| | {home_name} (${home_symbol}) | {away_name} (${away_symbol}) |
|---|---|---|
| Current Ranking | {home_rank_str} | {away_rank_str} |
| Sell Tax | {home_tax} | {away_tax} |
| Recent Form | {home_form} | {away_form} |

- **Venue:** {venue}
- **Upset Vault:** {vault_balance:.0f} WIRE

---

**Head-to-Head Record ({h2h_total} matches found):**

| {home_name} Wins | {away_name} Wins | No Result |
|---|---|---|
| {h2h_home_wins} | {h2h_away_wins} | {h2h_nr} |

---

**Detailed Analysis:**

{rag_analysis}

---

**Trading Dashboard:**

| Metric | Value |
|---|---|
| Favorite | ${fav_sym} ({fav_name}) |
| Underdog | ${dog_sym} ({dog_name}) |
| Upset Probability | {upset_pct}% |
| Risk Assessment | **{risk}** |
| Upset Vault Balance | {vault_balance:.0f} WIRE |
| Est. Vault Payout (per holder, if upset) | {vault_payout:.2f} WIRE |

**Suggested Positions:**
- **${fav_sym} holders:** HOLD — lower sell tax ({rank_home.sell_tax_pct if rank_home and fav_sym == home_symbol else rank_away.sell_tax_pct if rank_away else 'N/A'}%) favors holding through the match.
- **${dog_sym} speculative buy:** {"Consider a small position" if upset_prob > 0.25 else "Low conviction"} — {upset_pct}% upset probability with Vault payout upside.
- **Risk Management:** {"Set stop-losses. High-volatility matchup expected." if risk == "HIGH" else "Standard position sizing appropriate." if risk == "MEDIUM" else "Favorable risk/reward for the favorite."}

---
*Generated by Overflow AI Engine | {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}*
"""
        return report


# ── CLI ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

    home = sys.argv[1] if len(sys.argv) > 1 else "IU"
    away = sys.argv[2] if len(sys.argv) > 2 else "QG"

    gen = ReportGenerator()
    result = gen.generate(home, away)
    print(result["report"])
    print("\nTrading metadata:", result["trading"])
