"""
CricTrade AI Engine — RAG Pipeline.

LangChain-powered retrieval-augmented generation pipeline that combines
ChromaDB vector retrieval with Claude (Anthropic) to answer cricket trading
questions.  Falls back to template-based responses when no API key is set.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import ANTHROPIC_API_KEY, CLAUDE_MODEL, trading_context, resolve_team_name
from rag.vector_store import VectorStore

logger = logging.getLogger(__name__)

# ── System prompt ──────────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are the CricTrade AI Analyst — an expert cricket analyst and trading advisor \
for the CricTrade platform, a PSL (Pakistan Super League) cricket team token trading \
platform built on blockchain.

Your role:
1. Provide deep, data-driven cricket analysis using historical PSL match data.
2. Translate cricket insights into actionable trading recommendations for CricTrade \
   team tokens ($IU, $LQ, $MS, $PZ, $KK, $QG).
3. Assess upset probability and its impact on the Upset Vault payouts.
4. Consider current team rankings, sell tax differentials, and market positioning.

CricTrade Platform Context:
- Each PSL team has a tradeable token (e.g., $IU for Islamabad United).
- Higher-ranked teams have lower sell tax (favoring holds); lower-ranked teams have \
  higher sell tax (penalizing quick sells).
- The Upset Vault accumulates WIRE tokens and distributes to holders of the \
  underdog's token when an upset occurs (lower-ranked team beats higher-ranked team).
- Trading is on the WIRE blockchain.

{trading_context}

Analysis Guidelines:
- Use the provided historical match data to support all claims with statistics.
- Be specific about player matchups, venue factors, and phase-wise performance.
- Always include risk assessment (LOW / MEDIUM / HIGH) in trading recommendations.
- Consider recent form, head-to-head records, and venue history.
- When calculating upset probability, factor in current rankings, recent form, \
  and historical head-to-head data.
- Format responses in clean Markdown with headers, bullet points, and tables.
- Be confident and decisive — traders need clear signals, not hedging.
"""


def _build_system_prompt() -> str:
    """Construct the system prompt with current trading context."""
    return SYSTEM_PROMPT.format(trading_context=trading_context.format_for_prompt())


# ── LLM wrapper ────────────────────────────────────────────────────────────


def _get_llm():
    """Instantiate a LangChain ChatAnthropic model or return None."""
    if not ANTHROPIC_API_KEY:
        logger.warning("ANTHROPIC_API_KEY not set — LLM calls will use template fallback.")
        return None

    try:
        from langchain_anthropic import ChatAnthropic

        llm = ChatAnthropic(
            model=CLAUDE_MODEL,
            anthropic_api_key=ANTHROPIC_API_KEY,
            temperature=0.3,
            max_tokens=4096,
        )
        logger.info("LLM initialised: %s", CLAUDE_MODEL)
        return llm
    except Exception as exc:
        logger.error("Failed to initialise LLM: %s", exc)
        return None


# ── RAG Pipeline ───────────────────────────────────────────────────────────


class CricTradeRAG:
    """End-to-end RAG pipeline for CricTrade cricket analysis."""

    def __init__(self, vector_store: VectorStore | None = None) -> None:
        self._vs = vector_store or VectorStore()
        self._llm = _get_llm()

    @property
    def has_llm(self) -> bool:
        return self._llm is not None

    @property
    def vector_store(self) -> VectorStore:
        return self._vs

    # ── retrieval helpers ──────────────────────────────────────────────

    def _retrieve_context(
        self,
        query: str,
        n_per_collection: int = 5,
        collections: list[str] | None = None,
    ) -> str:
        """Retrieve and format relevant context from the vector store."""
        results = self._vs.multi_query(
            query_text=query,
            n_results_per_collection=n_per_collection,
            collections=collections,
        )

        context_parts: list[str] = []
        for coll_name, docs in results.items():
            if not docs:
                continue
            context_parts.append(f"### {coll_name.title()} Data")
            for doc in docs:
                context_parts.append(doc["text"])
            context_parts.append("")

        return "\n\n".join(context_parts)

    def _retrieve_team_context(
        self,
        team_a_symbol: str,
        team_b_symbol: str,
        n: int = 5,
    ) -> str:
        """Retrieve context specifically relevant to a matchup between two teams."""
        team_a = resolve_team_name(team_a_symbol)
        team_b = resolve_team_name(team_b_symbol)

        queries = [
            f"{team_a} vs {team_b} PSL match",
            f"{team_a} batting performance PSL",
            f"{team_b} batting performance PSL",
            f"{team_a} {team_b} head to head",
        ]

        all_docs: dict[str, list[dict[str, Any]]] = {}
        seen_ids: set[str] = set()

        for q in queries:
            results = self._vs.multi_query(q, n_results_per_collection=n)
            for coll, docs in results.items():
                if coll not in all_docs:
                    all_docs[coll] = []
                for d in docs:
                    if d["id"] not in seen_ids:
                        seen_ids.add(d["id"])
                        all_docs[coll].append(d)

        context_parts: list[str] = []
        for coll_name in ("matches", "innings", "players"):
            docs = all_docs.get(coll_name, [])
            if not docs:
                continue
            context_parts.append(f"### {coll_name.title()} Data")
            # Prioritise docs mentioning either team
            relevant = sorted(
                docs,
                key=lambda d: (
                    -int(team_a_symbol in d.get("text", "") or team_a in d.get("text", "")),
                    -int(team_b_symbol in d.get("text", "") or team_b in d.get("text", "")),
                    d.get("distance", 1.0),
                ),
            )
            for doc in relevant[:n]:
                context_parts.append(doc["text"])
            context_parts.append("")

        return "\n\n".join(context_parts)

    # ── main query method ──────────────────────────────────────────────

    def query(
        self,
        question: str,
        n_results: int = 5,
        collections: list[str] | None = None,
    ) -> dict[str, Any]:
        """Run a free-form RAG query.

        Returns ``{"answer": str, "sources": list[dict], "model": str}``.
        """
        context = self._retrieve_context(question, n_per_collection=n_results, collections=collections)
        return self._generate(question, context)

    def analyze_matchup(
        self,
        team_a_symbol: str,
        team_b_symbol: str,
    ) -> dict[str, Any]:
        """Generate a detailed matchup analysis for a pre-match report."""
        team_a = resolve_team_name(team_a_symbol)
        team_b = resolve_team_name(team_b_symbol)
        context = self._retrieve_team_context(team_a_symbol, team_b_symbol, n=5)

        question = (
            f"Provide a comprehensive pre-match analysis for the upcoming PSL match: "
            f"{team_a} (${team_a_symbol}) vs {team_b} (${team_b_symbol}). "
            f"Include head-to-head record, key player matchups, venue analysis, "
            f"phase-wise performance comparison, upset probability, and a clear "
            f"trading recommendation with risk assessment."
        )

        return self._generate(question, context)

    def generate_signal(
        self,
        match_state: dict[str, Any],
    ) -> dict[str, Any]:
        """Generate a live trading signal based on current match state."""
        # Build a query from match state
        batting_team = match_state.get("batting_team", "Unknown")
        bowling_team = match_state.get("bowling_team", "Unknown")
        score = match_state.get("score", 0)
        wickets = match_state.get("wickets", 0)
        overs = match_state.get("overs", 0.0)
        target = match_state.get("target")
        innings = match_state.get("innings", 1)

        situation = (
            f"{batting_team} are {score}/{wickets} after {overs} overs"
            + (f" chasing {target}" if target and innings == 2 else "")
        )

        query = (
            f"PSL match: {batting_team} vs {bowling_team}. "
            f"Current situation: {situation}. Innings {innings}. "
            f"Historical similar situations and outcomes."
        )

        context = self._retrieve_context(query, n_per_collection=3)

        signal_question = (
            f"Based on the current match state and historical data, generate a trading signal.\n\n"
            f"Current Match State:\n"
            f"- {situation}\n"
            f"- Innings: {innings}\n\n"
            f"Provide:\n"
            f"1. Signal for {batting_team} token: BUY / SELL / HOLD\n"
            f"2. Signal for {bowling_team} token: BUY / SELL / HOLD\n"
            f"3. Confidence (0-100) for each signal\n"
            f"4. Brief reasoning\n"
            f"5. Win probability for each team"
        )

        return self._generate(signal_question, context)

    # ── generation (LLM or fallback) ───────────────────────────────────

    def _generate(self, question: str, context: str) -> dict[str, Any]:
        """Generate a response using LLM + context, or fall back to templates."""
        if self._llm is not None:
            return self._generate_llm(question, context)
        return self._generate_template(question, context)

    def _generate_llm(self, question: str, context: str) -> dict[str, Any]:
        """Generate using Claude via LangChain."""
        from langchain_core.messages import HumanMessage, SystemMessage

        system_prompt = _build_system_prompt()
        user_msg = (
            f"## Retrieved Historical Data\n\n{context}\n\n"
            f"---\n\n## Question\n\n{question}"
        )

        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_msg),
            ]
            response = self._llm.invoke(messages)
            answer = response.content if hasattr(response, "content") else str(response)

            return {
                "answer": answer,
                "model": CLAUDE_MODEL,
                "context_used": bool(context.strip()),
                "fallback": False,
            }
        except Exception as exc:
            logger.error("LLM generation failed: %s — falling back to template.", exc)
            return self._generate_template(question, context)

    def _generate_template(self, question: str, context: str) -> dict[str, Any]:
        """Generate a template-based response when no LLM is available."""
        # Extract team symbols from question if present
        from config import TEAM_SYMBOLS, SYMBOL_TO_TEAM

        found_symbols: list[str] = []
        q_upper = question.upper()
        for sym in SYMBOL_TO_TEAM:
            if f"${sym}" in q_upper or f"({sym})" in q_upper or f" {sym} " in q_upper:
                found_symbols.append(sym)

        if len(found_symbols) >= 2:
            answer = _template_matchup(found_symbols[0], found_symbols[1], context)
        elif "signal" in question.lower() or "trading" in question.lower():
            answer = _template_signal(question, context)
        else:
            answer = _template_generic(question, context)

        return {
            "answer": answer,
            "model": "template-fallback",
            "context_used": bool(context.strip()),
            "fallback": True,
        }


# ── template responses ─────────────────────────────────────────────────────


def _template_matchup(sym_a: str, sym_b: str, context: str) -> str:
    """Generate a template matchup analysis."""
    team_a = resolve_team_name(sym_a)
    team_b = resolve_team_name(sym_b)
    rank_a = trading_context.get_ranking(sym_a)
    rank_b = trading_context.get_ranking(sym_b)

    rank_a_str = f"#{rank_a.rank} (Sell Tax: {rank_a.sell_tax_pct}%)" if rank_a else "N/A"
    rank_b_str = f"#{rank_b.rank} (Sell Tax: {rank_b.sell_tax_pct}%)" if rank_b else "N/A"
    form_a = rank_a.recent_form if rank_a else "N/A"
    form_b = rank_b.recent_form if rank_b else "N/A"

    # Determine favorite/underdog
    if rank_a and rank_b:
        fav = sym_a if rank_a.rank < rank_b.rank else sym_b
        dog = sym_b if fav == sym_a else sym_a
        fav_name = resolve_team_name(fav)
        dog_name = resolve_team_name(dog)
    else:
        fav, dog = sym_a, sym_b
        fav_name, dog_name = team_a, team_b

    return f"""## CricTrade AI Pre-Match Analysis
### {team_a} (${sym_a}) vs {team_b} (${sym_b})

**Current Standings:**
- ${sym_a} {team_a}: {rank_a_str} | Recent Form: {form_a}
- ${sym_b} {team_b}: {rank_b_str} | Recent Form: {form_b}
- Upset Vault: {trading_context.upset_vault_wire:.0f} WIRE

**Head-to-Head Summary:**
Based on available historical data, both teams have competitive records against each other in the PSL. Key matchups between their batting and bowling lineups have produced entertaining contests.

**Key Factors:**
- **Batting Depth:** Both squads feature international-calibre batters capable of match-winning performances.
- **Bowling Attack:** Pace and spin variety will be crucial in determining the outcome.
- **Recent Form:** {team_a} ({form_a}) vs {team_b} ({form_b}) — form entering the match could be decisive.

**Historical Data Retrieved:**
{context[:500] if context else "No historical data available — analysis based on general PSL knowledge."}

**Trading Recommendation:**
- **Favorite:** ${fav} ({fav_name}) — lower sell tax makes this a safer hold
- **Underdog:** ${dog} ({dog_name}) — higher sell tax but Upset Vault payout potential
- **Risk Assessment:** MEDIUM
- **Upset Probability:** ~35%
- **Strategy:** Consider a small position in ${dog} for Upset Vault exposure while maintaining core ${fav} holdings

> *Note: This analysis was generated without LLM access. Set ANTHROPIC_API_KEY for detailed AI-powered analysis.*
"""


def _template_signal(question: str, context: str) -> str:
    """Generate a template trading signal."""
    return f"""## CricTrade Trading Signal

**Signal Generated:** Based on available match data and historical patterns.

**Market Context:**
{trading_context.format_for_prompt()}

**Analysis:**
Current match conditions suggest moderate trading opportunities. Historical data indicates that similar match situations have produced varying outcomes.

**Signals:**
| Token | Signal | Confidence |
|-------|--------|------------|
| Batting Team | HOLD | 55 |
| Bowling Team | HOLD | 50 |

**Reasoning:**
Without real-time match data integration, signals default to HOLD with moderate confidence. The historical context suggests waiting for clearer indicators before taking positions.

> *Note: Set ANTHROPIC_API_KEY for AI-powered live signals.*
"""


def _template_generic(question: str, context: str) -> str:
    """Generate a generic template response."""
    return f"""## CricTrade AI Analysis

**Your Question:** {question}

**Available Context:**
{context[:800] if context else "No specific historical data retrieved for this query."}

**Analysis:**
Based on the available PSL historical data, here is a summary of relevant insights. The Pakistan Super League features six competitive franchises, each with distinct strengths in batting, bowling, and fielding departments.

**Trading Context:**
{trading_context.format_for_prompt()}

For more detailed analysis with specific statistical breakdowns and trading recommendations, ensure your ANTHROPIC_API_KEY is configured.

> *Note: This is a template response. Set ANTHROPIC_API_KEY for full AI-powered analysis.*
"""


# ── CLI ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

    rag = CricTradeRAG()
    print("LLM available:", rag.has_llm)
    print("Vector store populated:", rag.vector_store.is_populated())

    result = rag.query("How have Islamabad United performed in PSL 2024?")
    print("\n" + result["answer"])
