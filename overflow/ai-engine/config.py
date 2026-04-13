"""
Overflow AI Engine — Configuration Module.

Central configuration for all AI engine components including model settings,
team metadata, venue mappings, and trading parameters.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
CHROMADB_DIR = Path(os.getenv("CHROMADB_PATH", str(DATA_DIR / "chromadb")))
RAW_DATA_DIR = DATA_DIR / "raw"
MODEL_DIR = BASE_DIR / "models" / "artifacts"

# ---------------------------------------------------------------------------
# API / LLM
# ---------------------------------------------------------------------------
ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL: str = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514")
EMBEDDING_MODEL: str = os.getenv(
    "EMBEDDING_MODEL", "all-MiniLM-L6-v2"
)  # sentence-transformers default

# ---------------------------------------------------------------------------
# Flask
# ---------------------------------------------------------------------------
FLASK_PORT: int = int(os.getenv("FLASK_PORT", "5001"))
FLASK_DEBUG: bool = os.getenv("FLASK_DEBUG", "false").lower() == "true"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

# ---------------------------------------------------------------------------
# PSL Team Metadata
# ---------------------------------------------------------------------------
TEAM_SYMBOLS: dict[str, str] = {
    "Islamabad United": "IU",
    "Karachi Kings": "KK",
    "Lahore Qalandars": "LQ",
    "Multan Sultans": "MS",
    "Peshawar Zalmi": "PZ",
    "Quetta Gladiators": "QG",
}

SYMBOL_TO_TEAM: dict[str, str] = {v: k for k, v in TEAM_SYMBOLS.items()}

# Reverse lookups for variations found in Cricsheet data
TEAM_ALIASES: dict[str, str] = {
    "Islamabad United": "IU",
    "Karachi Kings": "KK",
    "Lahore Qalandars": "LQ",
    "Multan Sultans": "MS",
    "Peshawar Zalmi": "PZ",
    "Quetta Gladiators": "QG",
    # Common abbreviations
    "IU": "IU",
    "KK": "KK",
    "LQ": "LQ",
    "MS": "MS",
    "PZ": "PZ",
    "QG": "QG",
}

# ---------------------------------------------------------------------------
# PSL Venues
# ---------------------------------------------------------------------------
PSL_VENUES: list[str] = [
    "National Stadium, Karachi",
    "Gaddafi Stadium, Lahore",
    "Rawalpindi Cricket Stadium, Rawalpindi",
    "Multan Cricket Stadium, Multan",
    "Arbab Niaz Stadium, Peshawar",
    "Sharjah Cricket Stadium, Sharjah",
    "Dubai International Cricket Stadium, Dubai",
    "Sheikh Zayed Stadium, Abu Dhabi",
]

# ---------------------------------------------------------------------------
# Default Trading Context (injected into prompts)
# ---------------------------------------------------------------------------

@dataclass
class TeamRanking:
    """Current PSL season ranking and associated sell tax."""

    symbol: str
    rank: int
    sell_tax_pct: float  # percentage
    recent_form: str = "N/A"  # e.g. "W W L W L"


@dataclass
class TradingContext:
    """Dynamic context injected into every AI prompt."""

    upset_vault_wire: float = 800.0
    rankings: list[TeamRanking] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.rankings:
            # sensible defaults for demo
            self.rankings = [
                TeamRanking("IU", 1, 2.0, "W W W L W"),
                TeamRanking("LQ", 2, 5.0, "W L W W L"),
                TeamRanking("MS", 3, 8.0, "L W W L W"),
                TeamRanking("PZ", 4, 10.0, "W L L W L"),
                TeamRanking("KK", 5, 12.0, "L L W L W"),
                TeamRanking("QG", 6, 15.0, "L L L W L"),
            ]

    def get_ranking(self, symbol: str) -> TeamRanking | None:
        """Return ranking for a team symbol."""
        for r in self.rankings:
            if r.symbol == symbol:
                return r
        return None

    def format_for_prompt(self) -> str:
        """Return a human-readable string suitable for LLM prompt injection."""
        lines = ["Current PSL Standings & Sell Tax:"]
        for r in sorted(self.rankings, key=lambda x: x.rank):
            lines.append(
                f"  #{r.rank} ${r.symbol} — Sell Tax: {r.sell_tax_pct}% — "
                f"Recent Form: {r.recent_form}"
            )
        lines.append(f"\nUpset Vault Balance: {self.upset_vault_wire:.0f} WIRE")
        return "\n".join(lines)


# Singleton trading context — updated at runtime by the backend
trading_context = TradingContext()


def resolve_team_symbol(name_or_symbol: str) -> str:
    """Resolve a team name or alias to its canonical symbol."""
    name_or_symbol = name_or_symbol.strip()
    if name_or_symbol in TEAM_ALIASES:
        return TEAM_ALIASES[name_or_symbol]
    # Fuzzy: check if any team name starts with the input
    for full_name, sym in TEAM_SYMBOLS.items():
        if full_name.lower().startswith(name_or_symbol.lower()):
            return sym
    return name_or_symbol.upper()[:2]


def resolve_team_name(symbol: str) -> str:
    """Resolve a symbol to its full team name."""
    return SYMBOL_TO_TEAM.get(symbol.upper(), symbol)
