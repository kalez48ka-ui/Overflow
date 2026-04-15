"""
Overflow AI Engine — Flask API Server.

Serves pre-match analysis reports, live trading signals, free-form RAG queries,
and health checks on port 5001.
"""

from __future__ import annotations

import logging
import os
import threading
import traceback

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from config import FLASK_DEBUG, FLASK_PORT, LOG_LEVEL, TEAM_SYMBOLS, trading_context
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
app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024  # 1 MB

_allowed_origins = {
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
}
for _env_key in ("BACKEND_URL", "FRONTEND_URL"):
    _url = os.getenv(_env_key, "")
    if _url and _url != "*" and _url.startswith("http"):
        _allowed_origins.add(_url)
_allowed_origins = list(_allowed_origins)

CORS(app, origins=_allowed_origins, methods=["GET", "POST", "OPTIONS"], allow_headers=["Content-Type", "x-api-key"], supports_credentials=False)

limiter = Limiter(get_remote_address, app=app, default_limits=["60 per minute"])

# ── authentication ────────────────────────────────────────────────────────

AI_API_KEY = os.getenv("AI_API_KEY", "")


def _require_api_key():
    """Check x-api-key header matches AI_API_KEY."""
    if not AI_API_KEY:
        return None  # No key configured = skip auth (dev mode)
    key = request.headers.get("x-api-key", "")
    if key != AI_API_KEY:
        return jsonify({"error": "Unauthorized"}), 401
    return None

# ── lazy globals ───────────────────────────────────────────────────────────

_vector_store: VectorStore | None = None
_rag: OverflowRAG | None = None
_report_gen: ReportGenerator | None = None
_signal_gen: SignalGenerator | None = None
_win_prob: WinProbabilityModel | None = None
_initialised = False
_init_lock = threading.Lock()


def _init() -> None:
    """Initialise the AI engine components (called once on first request)."""
    global _vector_store, _rag, _report_gen, _signal_gen, _win_prob, _initialised

    if _initialised:
        return

    with _init_lock:
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
    if request.path in ("/health", "/api/ai/health"):
        return
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
@limiter.limit("10 per minute")
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
        return jsonify({"error": "Internal processing error"}), 500


@app.route("/api/ai/signal", methods=["POST"])
@limiter.limit("10 per minute")
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
        return jsonify({"error": "Internal processing error"}), 500


@app.route("/api/ai/query", methods=["POST"])
@limiter.limit("10 per minute")
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
        return jsonify({"error": "Internal processing error"}), 500


@app.route("/api/ai/win-probability", methods=["POST"])
@limiter.limit("30 per minute")
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
    except (ValueError, TypeError) as exc:
        return jsonify({"error": f"Invalid numeric value: {exc}"}), 400

    # Validate ranges
    if not (0 <= overs <= 20):
        return jsonify({"error": "overs must be between 0 and 20"}), 400
    partial_balls = round((overs % 1) * 10)
    if partial_balls > 5:
        return jsonify({"error": "invalid overs: ball component must be 0-5 (e.g. 14.3, not 14.7)"}), 400
    if not (0 <= wickets <= 10):
        return jsonify({"error": "wickets must be between 0 and 10"}), 400
    if score < 0:
        return jsonify({"error": "score must be non-negative"}), 400
    if innings not in (1, 2):
        return jsonify({"error": "innings must be 1 or 2"}), 400
    if target is not None and target <= 0:
        return jsonify({"error": "target must be a positive number"}), 400

    try:
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
        return jsonify({"error": "Internal processing error"}), 500


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


VALID_SYMBOLS = set(TEAM_SYMBOLS.values())


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
    auth_response = _require_api_key()
    if auth_response is not None:
        return auth_response

    data = request.get_json(silent=True) or {}

    if "upset_vault_wire" in data:
        try:
            vault_wire = float(data["upset_vault_wire"])
        except (ValueError, TypeError):
            return jsonify({"error": "upset_vault_wire must be a number"}), 400
        if vault_wire < 0:
            return jsonify({"error": "upset_vault_wire must be non-negative"}), 400
        trading_context.upset_vault_wire = vault_wire

    if "rankings" in data:
        if not isinstance(data["rankings"], list):
            return jsonify({"error": "rankings must be a list"}), 400

        from config import TeamRanking

        validated_rankings = []
        for i, r in enumerate(data["rankings"]):
            if not isinstance(r, dict):
                return jsonify({"error": f"rankings[{i}] must be an object"}), 400

            symbol = r.get("symbol")
            if symbol not in VALID_SYMBOLS:
                return jsonify({"error": f"rankings[{i}].symbol must be one of {sorted(VALID_SYMBOLS)}"}), 400

            try:
                rank = int(r.get("rank", 0))
            except (ValueError, TypeError):
                return jsonify({"error": f"rankings[{i}].rank must be an integer"}), 400
            if not (1 <= rank <= 8):
                return jsonify({"error": f"rankings[{i}].rank must be between 1 and 8"}), 400

            try:
                sell_tax_pct = float(r.get("sell_tax_pct", 0))
            except (ValueError, TypeError):
                return jsonify({"error": f"rankings[{i}].sell_tax_pct must be a number"}), 400
            if not (0 <= sell_tax_pct <= 100):
                return jsonify({"error": f"rankings[{i}].sell_tax_pct must be between 0 and 100"}), 400

            validated_rankings.append(
                TeamRanking(
                    symbol=symbol,
                    rank=rank,
                    sell_tax_pct=sell_tax_pct,
                    recent_form=str(r.get("recent_form", "N/A")),
                )
            )
        trading_context.rankings = validated_rankings

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

@app.errorhandler(413)
def request_too_large(e: Exception) -> tuple:
    return jsonify({"error": "Request too large"}), 413


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
