"""
CricTrade AI Engine — Live Trading Signal Generator.

Takes a current match state (score, overs, wickets, target) and compares it
to historical PSL situations in the vector store.  Produces structured
BUY / SELL / HOLD signals with confidence scores for each team token.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import resolve_team_name, resolve_team_symbol, trading_context
from rag.pipeline import CricTradeRAG
from rag.vector_store import VectorStore

logger = logging.getLogger(__name__)

SignalType = Literal["BUY", "SELL", "HOLD"]


def _clamp(val: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, val))


class SignalGenerator:
    """Generate live trading signals from current match state + historical RAG."""

    def __init__(self, rag: CricTradeRAG | None = None) -> None:
        self._rag = rag or CricTradeRAG()
        self._win_prob_model: Any = None  # lazy-loaded

    # ── public API ─────────────────────────────────────────────────────

    def generate(self, match_state: dict[str, Any]) -> dict[str, Any]:
        """Generate a trading signal from the current match state.

        Expected ``match_state`` keys:
            batting_team: str        — team currently batting (symbol or name)
            bowling_team: str        — team currently bowling
            score: int               — current runs scored
            wickets: int             — wickets fallen
            overs: float             — overs bowled (e.g. 12.3)
            target: int | None       — target in 2nd innings
            innings: int             — 1 or 2
            venue: str (optional)    — venue name
            recent_boundary: bool    — was the last ball a boundary?
            recent_wicket: bool      — did a wicket just fall?

        Returns a JSON-serializable signal dict.
        """
        # Normalise inputs
        bat_team = resolve_team_symbol(str(match_state.get("batting_team", "")))
        bowl_team = resolve_team_symbol(str(match_state.get("bowling_team", "")))
        score = int(match_state.get("score", 0))
        wickets = int(match_state.get("wickets", 0))
        overs = float(match_state.get("overs", 0.0))
        target = match_state.get("target")
        if target is not None:
            target = int(target)
        innings = int(match_state.get("innings", 1))
        venue = str(match_state.get("venue", ""))
        recent_boundary = bool(match_state.get("recent_boundary", False))
        recent_wicket = bool(match_state.get("recent_wicket", False))

        bat_name = resolve_team_name(bat_team)
        bowl_name = resolve_team_name(bowl_team)

        # Compute win probability
        win_prob = self._compute_win_probability(
            score=score,
            wickets=wickets,
            overs=overs,
            target=target,
            innings=innings,
            bat_team=bat_team,
            bowl_team=bowl_team,
            venue=venue,
        )

        bat_win_prob = win_prob["batting_team"]
        bowl_win_prob = win_prob["bowling_team"]

        # Retrieve historical context for similar situations
        historical = self._retrieve_historical_comparison(
            bat_team=bat_team,
            bowl_team=bowl_team,
            score=score,
            wickets=wickets,
            overs=overs,
            innings=innings,
        )

        # Generate signals
        bat_signal, bat_confidence, bat_reason = self._determine_signal(
            team_sym=bat_team,
            win_prob=bat_win_prob,
            is_batting=True,
            innings=innings,
            score=score,
            wickets=wickets,
            overs=overs,
            target=target,
            recent_boundary=recent_boundary,
            recent_wicket=recent_wicket,
        )

        bowl_signal, bowl_confidence, bowl_reason = self._determine_signal(
            team_sym=bowl_team,
            win_prob=bowl_win_prob,
            is_batting=False,
            innings=innings,
            score=score,
            wickets=wickets,
            overs=overs,
            target=target,
            recent_boundary=recent_boundary,
            recent_wicket=recent_wicket,
        )

        # Optional: use RAG for richer reasoning
        rag_insight = ""
        if self._rag.has_llm:
            try:
                rag_result = self._rag.generate_signal(match_state)
                rag_insight = rag_result.get("answer", "")
            except Exception as exc:
                logger.warning("RAG signal generation failed: %s", exc)

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "match_state": {
                "batting_team": bat_team,
                "bowling_team": bowl_team,
                "batting_team_name": bat_name,
                "bowling_team_name": bowl_name,
                "score": score,
                "wickets": wickets,
                "overs": overs,
                "target": target,
                "innings": innings,
            },
            "signals": [
                {
                    "team": bat_team,
                    "team_name": bat_name,
                    "signal": bat_signal,
                    "confidence": round(bat_confidence),
                    "reasoning": bat_reason,
                    "win_probability": round(bat_win_prob, 1),
                },
                {
                    "team": bowl_team,
                    "team_name": bowl_name,
                    "signal": bowl_signal,
                    "confidence": round(bowl_confidence),
                    "reasoning": bowl_reason,
                    "win_probability": round(bowl_win_prob, 1),
                },
            ],
            "win_probability": {
                bat_team: round(bat_win_prob, 1),
                bowl_team: round(bowl_win_prob, 1),
            },
            "historical_context": historical,
            "rag_analysis": rag_insight[:500] if rag_insight else "",
            "model_used": "heuristic+logistic",
        }

    # ── win probability ────────────────────────────────────────────────

    def _compute_win_probability(
        self,
        score: int,
        wickets: int,
        overs: float,
        target: int | None,
        innings: int,
        bat_team: str,
        bowl_team: str,
        venue: str,
    ) -> dict[str, float]:
        """Compute win probability for both teams.

        Uses the trained logistic regression model if available, otherwise
        falls back to heuristic calculation.
        """
        # Try ML model first
        if self._win_prob_model is None:
            try:
                from models.win_probability import WinProbabilityModel
                self._win_prob_model = WinProbabilityModel()
                self._win_prob_model.load()
            except Exception:
                self._win_prob_model = "unavailable"

        if self._win_prob_model not in (None, "unavailable"):
            try:
                prob = self._win_prob_model.predict(
                    score=score,
                    wickets=wickets,
                    overs=overs,
                    target=target,
                    innings=innings,
                )
                return {
                    "batting_team": prob * 100,
                    "bowling_team": (1 - prob) * 100,
                }
            except Exception as exc:
                logger.warning("ML model prediction failed: %s — using heuristic.", exc)

        # Heuristic fallback
        return self._heuristic_win_prob(score, wickets, overs, target, innings)

    def _heuristic_win_prob(
        self,
        score: int,
        wickets: int,
        overs: float,
        target: int | None,
        innings: int,
    ) -> dict[str, float]:
        """Rule-based win probability estimation."""
        balls_bowled = int(overs) * 6 + round((overs % 1) * 10)
        balls_remaining = max(0, 120 - balls_bowled)
        overs_remaining = balls_remaining / 6

        if innings == 1:
            # 1st innings: estimate par score and compare
            if balls_bowled == 0:
                bat_prob = 50.0
            else:
                current_rr = score / (balls_bowled / 6) if balls_bowled > 0 else 0.0
                projected_total = score + current_rr * overs_remaining
                # PSL average total is ~160-170
                par_score = 165
                # Wickets factor: each wicket reduces projected total
                wicket_penalty = wickets * 5
                projected_total -= wicket_penalty

                if projected_total >= par_score + 20:
                    bat_prob = 55 + min(20, (projected_total - par_score) * 0.5)
                elif projected_total >= par_score:
                    bat_prob = 50 + (projected_total - par_score) * 0.25
                else:
                    bat_prob = 50 - (par_score - projected_total) * 0.3

        else:
            # 2nd innings: compare required rate to historical success
            if target is None:
                bat_prob = 50.0
            else:
                runs_needed = target - score
                if runs_needed <= 0:
                    bat_prob = 100.0
                elif balls_remaining <= 0:
                    bat_prob = 0.0
                else:
                    required_rr = runs_needed / (balls_remaining / 6)
                    current_rr = score / (balls_bowled / 6) if balls_bowled > 0 else 7.5

                    # Base probability from required rate
                    if required_rr <= 6.0:
                        bat_prob = 75 + (6.0 - required_rr) * 3
                    elif required_rr <= 8.0:
                        bat_prob = 60 + (8.0 - required_rr) * 7.5
                    elif required_rr <= 10.0:
                        bat_prob = 40 + (10.0 - required_rr) * 10
                    elif required_rr <= 12.0:
                        bat_prob = 20 + (12.0 - required_rr) * 10
                    elif required_rr <= 15.0:
                        bat_prob = 5 + (15.0 - required_rr) * 5
                    else:
                        bat_prob = max(2, 5 - (required_rr - 15.0) * 2)

                    # Wickets factor
                    wickets_in_hand = 10 - wickets
                    if wickets_in_hand <= 2:
                        bat_prob *= 0.5
                    elif wickets_in_hand <= 4:
                        bat_prob *= 0.7
                    elif wickets_in_hand >= 8:
                        bat_prob *= 1.1

        bat_prob = _clamp(bat_prob, 1.0, 99.0)
        return {
            "batting_team": bat_prob,
            "bowling_team": 100.0 - bat_prob,
        }

    # ── signal determination ───────────────────────────────────────────

    def _determine_signal(
        self,
        team_sym: str,
        win_prob: float,
        is_batting: bool,
        innings: int,
        score: int,
        wickets: int,
        overs: float,
        target: int | None,
        recent_boundary: bool,
        recent_wicket: bool,
    ) -> tuple[SignalType, float, str]:
        """Determine BUY/SELL/HOLD signal with confidence and reasoning."""
        rank = trading_context.get_ranking(team_sym)
        sell_tax = rank.sell_tax_pct if rank else 10.0

        # Base signal from win probability
        if win_prob >= 70:
            signal: SignalType = "BUY"
            confidence = 60 + (win_prob - 70) * 1.3
            reason = f"Strong position with {win_prob:.0f}% win probability."
        elif win_prob >= 55:
            signal = "BUY"
            confidence = 40 + (win_prob - 55) * 1.3
            reason = f"Favorable position with {win_prob:.0f}% win probability."
        elif win_prob >= 45:
            signal = "HOLD"
            confidence = 50
            reason = f"Even contest at {win_prob:.0f}% — hold position and wait for clarity."
        elif win_prob >= 30:
            signal = "SELL"
            confidence = 40 + (45 - win_prob) * 1.3
            reason = f"Under pressure at {win_prob:.0f}% win probability."
        else:
            signal = "SELL"
            confidence = 65 + (30 - win_prob) * 1.1
            reason = f"Critical situation at {win_prob:.0f}% — consider exiting."

        # Modify by sell tax (high sell tax discourages quick sells)
        if signal == "SELL" and sell_tax > 10:
            confidence -= 10
            reason += f" However, high sell tax ({sell_tax}%) may make holding preferable."

        # Momentum adjustments
        if recent_wicket and is_batting:
            if signal == "BUY":
                confidence -= 8
                reason += " Recent wicket introduces uncertainty."
            elif signal == "SELL":
                confidence += 5
                reason += " Momentum shifting after recent wicket fall."
        elif recent_wicket and not is_batting:
            if signal == "BUY":
                confidence += 5
                reason += " Bowling team gaining momentum with wicket."

        if recent_boundary and is_batting:
            if signal == "BUY":
                confidence += 3
                reason += " Batting momentum positive after boundary."

        # Upset Vault factor for underdogs
        if rank and rank.rank >= 5 and win_prob > 40:
            confidence += 5
            reason += f" Upset Vault ({trading_context.upset_vault_wire:.0f} WIRE) adds value to underdog position."

        # Phase-specific adjustments
        if overs < 6 and innings == 1:
            confidence = max(30, confidence - 10)
            reason += " Early powerplay — signals have higher uncertainty."
        elif overs > 15 and innings == 2 and target:
            confidence = min(95, confidence + 5)
            reason += " Death overs in chase — outcome becoming clearer."

        confidence = _clamp(confidence, 10, 95)

        return signal, confidence, reason

    # ── historical comparison ──────────────────────────────────────────

    def _retrieve_historical_comparison(
        self,
        bat_team: str,
        bowl_team: str,
        score: int,
        wickets: int,
        overs: float,
        innings: int,
    ) -> str:
        """Retrieve historically similar match situations from the vector store."""
        bat_name = resolve_team_name(bat_team)
        bowl_name = resolve_team_name(bowl_team)

        query = (
            f"{bat_name} scored {score}/{wickets} after {overs} overs "
            f"in innings {innings} PSL match"
        )

        docs = self._rag.vector_store.query("innings", query, n_results=3)

        if not docs:
            return "No comparable historical situations found in the database."

        comparisons: list[str] = []
        for doc in docs:
            meta = doc.get("metadata", {})
            text = doc.get("text", "")
            comparisons.append(
                f"- {meta.get('team', 'Unknown')} vs {meta.get('opponent', 'Unknown')} "
                f"({meta.get('season', 'N/A')}): "
                f"{meta.get('total_runs', '?')}/{meta.get('total_wickets', '?')} "
                f"(RR {meta.get('run_rate', '?')})"
            )

        return "Similar historical innings:\n" + "\n".join(comparisons)


# ── CLI ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import json

    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

    demo_state = {
        "batting_team": "IU",
        "bowling_team": "QG",
        "score": 120,
        "wickets": 3,
        "overs": 14.2,
        "target": None,
        "innings": 1,
        "recent_boundary": True,
        "recent_wicket": False,
    }

    gen = SignalGenerator()
    result = gen.generate(demo_state)
    print(json.dumps(result, indent=2))
