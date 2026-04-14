"""
Overflow AI Engine — Flask API Server.

Serves pre-match analysis reports, live trading signals, free-form RAG queries,
and health checks on port 5001.
"""

from __future__ import annotations

import logging
import os
import sys
import traceback
from pathlib import Path

# Ensure project root is on the path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from flask import Flask, jsonify, request
from flask_cors import CORS

from config import FLASK_DEBUG, FLASK_PORT, LOG_LEVEL, trading_context
from data.ingest import generate_demo_data, ingest_all
from models.win_probability import WinProbabilityModel
from rag.pipeline import OverflowRAG
from rag.report_generator import ReportGenerator
from rag.signals import SignalGenerator
from rag.vector_store import VectorStore

# ── logging setup ──────────────────────────────────────────────────────────

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("overflow.server")

# ── Flask app ──────────────────────────────────────────────────────────────

app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    os.getenv("BACKEND_URL", "http://localhost:3001"),
])

# ── lazy globals ───────────────────────────────────────────────────────────

_vector_store: VectorStore | None = None
_rag: OverflowRAG | None = None
_report_gen: ReportGenerator | None = None
_signal_gen: SignalGenerator | None = None
_win_prob: WinProbabilityModel | None = None
_initialised = False


def _init() -> None:
    """Initialise the AI engine components (called once on first request)."""
    global _vector_store, _rag, _report_gen, _signal_gen, _win_prob, _initialised

    if _initialised:
        return

    logger.info("Initialising Overflow AI Engine...")

    # 1. Vector store
    _vector_store = VectorStore()

    # 2. Ensure data is loaded
    if not _vector_store.is_populated():
        logger.info("Vector store is empty — loading data...")
        try:
            data = ingest_all(download=True)
            logger.info("Loaded Cricsheet data successfully.")
        except Exception as exc:
            logger.warning("Cricsheet download failed (%s) — using demo data.", exc)
            data = generate_demo_data()
        _vector_store.ingest_all(data)
    else:
        logger.info("Vector store already populated: %s", _vector_store.stats())

    # 3. RAG pipeline
    _rag = OverflowRAG(vector_store=_vector_store)
    logger.info("RAG pipeline ready (LLM available: %s).", _rag.has_llm)

    # 4. Report generator
    _report_gen = ReportGenerator(rag=_rag)

    # 5. Signal generator
    _signal_gen = SignalGenerator(rag=_rag)

    # 6. Win probability model
    _win_prob = WinProbabilityModel()
    if not _win_prob.load():
        logger.info("Training win probability model from scratch...")
        _win_prob.train_and_save()

    _initialised = True
    logger.info("Overflow AI Engine initialisation complete.")


@app.before_request
def ensure_initialised() -> None:
    """Ensure the engine is initialised before handling any request."""
    _init()


# ── routes ─────────────────────────────────────────────────────────────────


@app.route("/health", methods=["GET"])
@app.route("/api/ai/health", methods=["GET"])
def health() -> tuple:
    """Health check endpoint."""
    stats = _vector_store.stats() if _vector_store else {}
    return jsonify({
        "status": "ok",
        "engine": "Overflow AI Engine",
        "version": "1.0.0",
        "llm_available": _rag.has_llm if _rag else False,
        "vector_store": stats,
        "win_prob_model": _win_prob.is_fitted if _win_prob else False,
    }), 200


@app.route("/api/ai/analyze", methods=["POST"])
def analyze() -> tuple:
    """Generate a pre-match analysis report.

    Request body:
        {
            "homeTeam": "IU",
            "awayTeam": "QG",
            "venue": "National Stadium, Karachi"  (optional)
        }
    """
    data = request.get_json(silent=True) or {}
    home = data.get("homeTeam") or data.get("home_team")
    away = data.get("awayTeam") or data.get("away_team")
    venue = data.get("venue")

    if not home or not away:
        return jsonify({
            "error": "Missing required fields: homeTeam, awayTeam",
            "example": {"homeTeam": "IU", "awayTeam": "QG"},
        }), 400

    try:
        result = _report_gen.generate(home, away, venue=venue)
        return jsonify(result), 200
    except Exception as exc:
        logger.error("Analysis failed: %s\n%s", exc, traceback.format_exc())
        return jsonify({"error": str(exc)}), 500


@app.route("/api/ai/signal", methods=["POST"])
def signal() -> tuple:
    """Generate a live trading signal from current match state.

    Request body:
        {
            "matchState": {
                "batting_team": "IU",
                "bowling_team": "QG",
                "score": 120,
                "wickets": 3,
                "overs": 14.2,
                "target": null,
                "innings": 1,
                "recent_boundary": false,
                "recent_wicket": false
            }
        }
    """
    data = request.get_json(silent=True) or {}
    match_state = data.get("matchState") or data.get("match_state")

    if not match_state:
        return jsonify({
            "error": "Missing required field: matchState",
            "example": {
                "matchState": {
                    "batting_team": "IU",
                    "bowling_team": "QG",
                    "score": 120,
                    "wickets": 3,
                    "overs": 14.2,
                    "target": None,
                    "innings": 1,
                }
            },
        }), 400

    # Validate required subfields
    required = ["batting_team", "bowling_team", "score", "wickets", "overs"]
    missing = [f for f in required if f not in match_state]
    if missing:
        return jsonify({
            "error": f"Missing fields in matchState: {', '.join(missing)}",
        }), 400

    try:
        result = _signal_gen.generate(match_state)
        return jsonify(result), 200
    except Exception as exc:
        logger.error("Signal generation failed: %s\n%s", exc, traceback.format_exc())
        return jsonify({"error": str(exc)}), 500


@app.route("/api/ai/query", methods=["POST"])
def query() -> tuple:
    """Free-form RAG query.

    Request body:
        {
            "question": "How does Shaheen Afridi perform in death overs?"
        }
    """
    data = request.get_json(silent=True) or {}
    question = data.get("question")

    if not question:
        return jsonify({"error": "Missing required field: question"}), 400

    try:
        result = _rag.query(question)
        return jsonify(result), 200
    except Exception as exc:
        logger.error("Query failed: %s\n%s", exc, traceback.format_exc())
        return jsonify({"error": str(exc)}), 500


@app.route("/api/ai/win-probability", methods=["POST"])
def win_probability() -> tuple:
    """Get win probability for a match state.

    Request body:
        {
            "score": 120,
            "wickets": 3,
            "overs": 14.2,
            "target": null,
            "innings": 1
        }
    """
    data = request.get_json(silent=True) or {}
    required = ["score", "wickets", "overs"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        score = int(data["score"])
        wickets = int(data["wickets"])
        overs = float(data["overs"])
        target = int(data["target"]) if data.get("target") is not None else None
        innings = int(data.get("innings", 1))

        prob = _win_prob.predict(score, wickets, overs, target, innings)

        # Optional: trajectory
        include_trajectory = data.get("trajectory", False)
        trajectory = None
        if include_trajectory:
            trajectory = _win_prob.predict_trajectory(
                score, wickets, overs, target, innings,
                steps=int(data.get("steps", 10)),
            )

        return jsonify({
            "batting_team_win_probability": round(prob * 100, 1),
            "bowling_team_win_probability": round((1 - prob) * 100, 1),
            "trajectory": trajectory,
        }), 200
    except Exception as exc:
        logger.error("Win probability failed: %s\n%s", exc, traceback.format_exc())
        return jsonify({"error": str(exc)}), 500


@app.route("/api/ai/context", methods=["GET"])
def get_context() -> tuple:
    """Return current trading context (rankings, vault, etc.)."""
    return jsonify({
        "upset_vault_wire": trading_context.upset_vault_wire,
        "rankings": [
            {
                "symbol": r.symbol,
                "rank": r.rank,
                "sell_tax_pct": r.sell_tax_pct,
                "recent_form": r.recent_form,
            }
            for r in sorted(trading_context.rankings, key=lambda x: x.rank)
        ],
    }), 200


@app.route("/api/ai/context", methods=["POST"])
def update_context() -> tuple:
    """Update trading context (called by the backend).

    Request body:
        {
            "upset_vault_wire": 1200,
            "rankings": [
                {"symbol": "IU", "rank": 1, "sell_tax_pct": 2.0, "recent_form": "W W W L W"}
            ]
        }
    """
    data = request.get_json(silent=True) or {}

    if "upset_vault_wire" in data:
        trading_context.upset_vault_wire = float(data["upset_vault_wire"])

    if "rankings" in data:
        from config import TeamRanking
        trading_context.rankings = [
            TeamRanking(
                symbol=r["symbol"],
                rank=r["rank"],
                sell_tax_pct=r["sell_tax_pct"],
                recent_form=r.get("recent_form", "N/A"),
            )
            for r in data["rankings"]
        ]

    return jsonify({"status": "updated", "context": trading_context.format_for_prompt()}), 200


@app.route("/api/ai/stats", methods=["GET"])
def stats() -> tuple:
    """Return vector store statistics."""
    return jsonify({
        "vector_store": _vector_store.stats() if _vector_store else {},
        "llm_available": _rag.has_llm if _rag else False,
        "model_fitted": _win_prob.is_fitted if _win_prob else False,
    }), 200


# ── error handlers ─────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e: Exception) -> tuple:
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(405)
def method_not_allowed(e: Exception) -> tuple:
    return jsonify({"error": "Method not allowed"}), 405


@app.errorhandler(500)
def internal_error(e: Exception) -> tuple:
    return jsonify({"error": "Internal server error"}), 500


# ── main ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logger.info("Starting Overflow AI Engine on port %d ...", FLASK_PORT)
    app.run(
        host="0.0.0.0",
        port=FLASK_PORT,
        debug=FLASK_DEBUG,
    )
