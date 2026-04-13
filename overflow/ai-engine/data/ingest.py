"""
Overflow AI Engine — Cricsheet PSL Data Ingestion.

Downloads PSL match data from Cricsheet (JSON format), parses every match file,
and produces three tiers of structured text documents ready for embedding:

  1. Match-level summaries
  2. Innings-level breakdowns (powerplay / middle / death phases)
  3. Player-level career aggregates across all PSL seasons

The output is a list of ``Document`` dicts consumed by the vector store module.
"""

from __future__ import annotations

import json
import logging
import os
import subprocess
import tempfile
import zipfile
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import DATA_DIR, RAW_DATA_DIR, TEAM_SYMBOLS

logger = logging.getLogger(__name__)

CRICSHEET_PSL_URL = "https://cricsheet.org/downloads/psl_json.zip"
ZIP_PATH = DATA_DIR / "psl_json.zip"


# ── helpers ────────────────────────────────────────────────────────────────


def _safe_get(d: dict, *keys: str, default: Any = None) -> Any:
    """Nested dict getter that never raises."""
    cur = d
    for k in keys:
        if isinstance(cur, dict):
            cur = cur.get(k, default)
        else:
            return default
    return cur


def _team_symbol(name: str) -> str:
    """Best-effort resolve team name to symbol."""
    for full, sym in TEAM_SYMBOLS.items():
        if full.lower() in name.lower() or name.lower() in full.lower():
            return sym
    return name[:2].upper()


def _phase(over: int) -> str:
    """Classify an over number (0-indexed) into batting phase."""
    if over < 6:
        return "powerplay"
    if over < 15:
        return "middle"
    return "death"


# ── download ───────────────────────────────────────────────────────────────


def download_cricsheet_data(force: bool = False) -> Path:
    """Download the PSL JSON zip from Cricsheet and extract it.

    Returns the directory containing individual match JSON files.
    """
    RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)

    if ZIP_PATH.exists() and not force:
        logger.info("ZIP already present at %s — skipping download.", ZIP_PATH)
    else:
        logger.info("Downloading PSL data from %s ...", CRICSHEET_PSL_URL)
        try:
            subprocess.run(
                ["wget", "-q", "-O", str(ZIP_PATH), CRICSHEET_PSL_URL],
                check=True,
                timeout=120,
            )
            logger.info("Download complete.")
        except (subprocess.CalledProcessError, FileNotFoundError) as exc:
            logger.warning("wget failed (%s), trying curl ...", exc)
            subprocess.run(
                ["curl", "-sL", "-o", str(ZIP_PATH), CRICSHEET_PSL_URL],
                check=True,
                timeout=120,
            )

    # Extract
    if not any(RAW_DATA_DIR.glob("*.json")):
        logger.info("Extracting ZIP to %s ...", RAW_DATA_DIR)
        with zipfile.ZipFile(ZIP_PATH, "r") as zf:
            zf.extractall(RAW_DATA_DIR)
        logger.info("Extracted %d files.", len(list(RAW_DATA_DIR.rglob("*.json"))))
    else:
        logger.info("JSON files already extracted in %s.", RAW_DATA_DIR)

    return RAW_DATA_DIR


# ── parse single match ────────────────────────────────────────────────────


def _parse_innings(innings_data: dict) -> dict[str, Any]:
    """Parse a single innings block and return structured stats."""
    team = innings_data.get("team", "Unknown")
    overs_list = innings_data.get("overs", [])

    total_runs = 0
    total_wickets = 0
    total_balls = 0
    extras = 0
    batters: dict[str, dict] = defaultdict(lambda: {"runs": 0, "balls": 0, "fours": 0, "sixes": 0, "out": False, "dismissal": ""})
    bowlers: dict[str, dict] = defaultdict(lambda: {"runs": 0, "balls": 0, "wickets": 0, "extras": 0})
    phase_runs: dict[str, int] = {"powerplay": 0, "middle": 0, "death": 0}
    phase_wickets: dict[str, int] = {"powerplay": 0, "middle": 0, "death": 0}
    phase_balls: dict[str, int] = {"powerplay": 0, "middle": 0, "death": 0}
    fall_of_wickets: list[dict] = []

    for over_block in overs_list:
        over_num = over_block.get("over", 0)
        p = _phase(over_num)
        deliveries = over_block.get("deliveries", [])
        for delivery in deliveries:
            runs_info = delivery.get("runs", {})
            batter_runs = runs_info.get("batter", 0)
            total_delivery_runs = runs_info.get("total", 0)
            extra_runs = runs_info.get("extras", 0)

            batter_name = delivery.get("batter", "Unknown")
            bowler_name = delivery.get("bowler", "Unknown")

            batters[batter_name]["runs"] += batter_runs
            batters[batter_name]["balls"] += 1
            if batter_runs == 4:
                batters[batter_name]["fours"] += 1
            if batter_runs == 6:
                batters[batter_name]["sixes"] += 1

            bowlers[bowler_name]["runs"] += total_delivery_runs
            bowlers[bowler_name]["balls"] += 1

            total_runs += total_delivery_runs
            extras += extra_runs
            total_balls += 1

            phase_runs[p] += total_delivery_runs
            phase_balls[p] += 1

            # Wickets
            if "wickets" in delivery:
                for w in delivery["wickets"]:
                    total_wickets += 1
                    phase_wickets[p] += 1
                    bowlers[bowler_name]["wickets"] += 1
                    dismissed = w.get("player_out", "")
                    kind = w.get("kind", "")
                    batters[dismissed]["out"] = True
                    batters[dismissed]["dismissal"] = kind
                    fall_of_wickets.append({
                        "player": dismissed,
                        "runs": total_runs,
                        "wickets": total_wickets,
                        "over": f"{over_num}.{total_balls % 6 if total_balls % 6 != 0 else 6}",
                    })

            # Extras detail
            if "extras" in delivery:
                bowlers[bowler_name]["extras"] += extra_runs

    overs_str = f"{total_balls // 6}.{total_balls % 6}" if total_balls % 6 else str(total_balls // 6)

    # Sort batters by runs, bowlers by wickets
    top_batters = sorted(batters.items(), key=lambda x: x[1]["runs"], reverse=True)
    top_bowlers = sorted(bowlers.items(), key=lambda x: (x[1]["wickets"], -x[1]["runs"]), reverse=True)

    def _sr(runs: int, balls: int) -> float:
        return round(runs / balls * 100, 1) if balls else 0.0

    def _econ(runs: int, balls: int) -> float:
        return round(runs / (balls / 6), 2) if balls else 0.0

    def _rr(runs: int, balls: int) -> float:
        return round(runs / (balls / 6), 2) if balls else 0.0

    return {
        "team": team,
        "total_runs": total_runs,
        "total_wickets": total_wickets,
        "total_balls": total_balls,
        "overs": overs_str,
        "extras": extras,
        "run_rate": _rr(total_runs, total_balls),
        "top_batters": [
            {
                "name": name,
                "runs": s["runs"],
                "balls": s["balls"],
                "fours": s["fours"],
                "sixes": s["sixes"],
                "sr": _sr(s["runs"], s["balls"]),
                "out": s["out"],
                "dismissal": s["dismissal"],
            }
            for name, s in top_batters[:6]
        ],
        "top_bowlers": [
            {
                "name": name,
                "wickets": s["wickets"],
                "runs": s["runs"],
                "balls": s["balls"],
                "econ": _econ(s["runs"], s["balls"]),
            }
            for name, s in top_bowlers[:6]
        ],
        "phase_stats": {
            p: {
                "runs": phase_runs[p],
                "wickets": phase_wickets[p],
                "balls": phase_balls[p],
                "run_rate": _rr(phase_runs[p], phase_balls[p]),
            }
            for p in ("powerplay", "middle", "death")
        },
        "all_batters": dict(batters),
        "all_bowlers": dict(bowlers),
    }


def parse_match_file(filepath: Path) -> dict[str, Any] | None:
    """Parse a single Cricsheet JSON match file and return structured data."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except (json.JSONDecodeError, IOError) as exc:
        logger.warning("Skipping %s: %s", filepath.name, exc)
        return None

    info = raw.get("info", {})
    teams = info.get("teams", [])
    if len(teams) < 2:
        return None

    # Ensure it's a PSL match
    event_name = _safe_get(info, "event", "name", default="")
    if "Pakistan Super League" not in event_name and "PSL" not in event_name:
        # Some files might not have this — still process if in the PSL zip
        pass

    season = str(info.get("season", "unknown"))
    match_number_raw = _safe_get(info, "event", "match_number", default="")
    match_number = str(match_number_raw) if match_number_raw else ""
    dates = info.get("dates", [])
    date_str = dates[0] if dates else "unknown"
    venue = info.get("venue", "Unknown Venue")
    city = info.get("city", "")
    toss = info.get("toss", {})
    toss_winner = toss.get("winner", "")
    toss_decision = toss.get("decision", "")
    outcome = info.get("outcome", {})
    winner = outcome.get("winner", "")
    win_by = outcome.get("by", {})
    result_str = ""
    if winner:
        if "runs" in win_by:
            result_str = f"{winner} won by {win_by['runs']} runs"
        elif "wickets" in win_by:
            result_str = f"{winner} won by {win_by['wickets']} wickets"
        else:
            result_str = f"{winner} won"
    elif "result" in outcome:
        result_str = outcome["result"]
    else:
        result_str = "No result"

    player_of_match = info.get("player_of_match", [])
    potm = player_of_match[0] if player_of_match else ""

    # Parse innings
    innings_raw = raw.get("innings", [])
    innings_parsed: list[dict[str, Any]] = []
    for inn in innings_raw:
        innings_parsed.append(_parse_innings(inn))

    match_id = filepath.stem

    return {
        "match_id": match_id,
        "season": season,
        "match_number": match_number,
        "date": date_str,
        "venue": venue,
        "city": city,
        "teams": teams,
        "toss_winner": toss_winner,
        "toss_decision": toss_decision,
        "winner": winner,
        "result": result_str,
        "player_of_match": potm,
        "innings": innings_parsed,
    }


# ── document generation ───────────────────────────────────────────────────


def _match_doc(m: dict[str, Any]) -> dict[str, Any]:
    """Create a match-level document for embedding."""
    team_a, team_b = m["teams"][0], m["teams"][1]
    sym_a, sym_b = _team_symbol(team_a), _team_symbol(team_b)

    inn_summaries: list[str] = []
    for i, inn in enumerate(m["innings"]):
        top_bat = ", ".join(
            f"{b['name']} {b['runs']}({b['balls']})" for b in inn["top_batters"][:3]
        )
        top_bowl = ", ".join(
            f"{b['name']} {b['wickets']}/{b['runs']}" for b in inn["top_bowlers"][:3] if b["wickets"] > 0
        )
        inn_summaries.append(
            f"{'1st' if i == 0 else '2nd'} Innings — {inn['team']}: "
            f"{inn['total_runs']}/{inn['total_wickets']} ({inn['overs']} overs, RR {inn['run_rate']}). "
            f"Top batters: {top_bat or 'N/A'}. "
            f"Top bowlers: {top_bowl or 'N/A'}."
        )

    potm_str = f" Player of the Match: {m['player_of_match']}." if m["player_of_match"] else ""

    text = (
        f"PSL {m['season']} Match{' ' + m['match_number'] if m['match_number'] else ''}: "
        f"{team_a} ({sym_a}) vs {team_b} ({sym_b}) at {m['venue']}"
        f"{', ' + m['city'] if m['city'] else ''} on {m['date']}. "
        f"Toss: {m['toss_winner']} elected to {m['toss_decision']}. "
        f"{m['result']}.{potm_str} "
        + " ".join(inn_summaries)
    )

    return {
        "id": f"match_{m['match_id']}",
        "text": text,
        "metadata": {
            "type": "match",
            "match_id": m["match_id"],
            "season": m["season"],
            "date": m["date"],
            "venue": m["venue"],
            "city": m["city"],
            "team_a": team_a,
            "team_b": team_b,
            "sym_a": sym_a,
            "sym_b": sym_b,
            "winner": m["winner"],
            "result": m["result"],
            "player_of_match": m["player_of_match"],
        },
    }


def _innings_docs(m: dict[str, Any]) -> list[dict[str, Any]]:
    """Create innings-level documents for embedding."""
    docs: list[dict[str, Any]] = []
    for idx, inn in enumerate(m["innings"]):
        team = inn["team"]
        sym = _team_symbol(team)
        opp = [t for t in m["teams"] if t != team]
        opp_name = opp[0] if opp else "Unknown"
        opp_sym = _team_symbol(opp_name)

        bat_lines = []
        for b in inn["top_batters"][:5]:
            out_str = f" ({b['dismissal']})" if b["out"] else " (not out)"
            bat_lines.append(
                f"  {b['name']}: {b['runs']} off {b['balls']} balls "
                f"(SR {b['sr']}, {b['fours']}x4, {b['sixes']}x6){out_str}"
            )

        bowl_lines = []
        for b in inn["top_bowlers"][:5]:
            overs_b = f"{b['balls'] // 6}.{b['balls'] % 6}" if b["balls"] % 6 else str(b["balls"] // 6)
            bowl_lines.append(
                f"  {b['name']}: {b['wickets']}/{b['runs']} in {overs_b} overs (Econ {b['econ']})"
            )

        pp = inn["phase_stats"]["powerplay"]
        mid = inn["phase_stats"]["middle"]
        death = inn["phase_stats"]["death"]

        text = (
            f"PSL {m['season']}, {m['date']} — {team} ({sym}) innings vs {opp_name} ({opp_sym}) "
            f"at {m['venue']}. "
            f"Total: {inn['total_runs']}/{inn['total_wickets']} ({inn['overs']} overs). "
            f"Run rate: {inn['run_rate']}. "
            f"Powerplay (overs 1-6): {pp['runs']}/{pp['wickets']} (RR {pp['run_rate']}). "
            f"Middle (overs 7-15): {mid['runs']}/{mid['wickets']} (RR {mid['run_rate']}). "
            f"Death (overs 16-20): {death['runs']}/{death['wickets']} (RR {death['run_rate']}). "
            f"Batting:\n" + "\n".join(bat_lines) + "\n"
            f"Bowling:\n" + "\n".join(bowl_lines)
        )

        docs.append({
            "id": f"innings_{m['match_id']}_{idx}",
            "text": text,
            "metadata": {
                "type": "innings",
                "match_id": m["match_id"],
                "season": m["season"],
                "date": m["date"],
                "venue": m["venue"],
                "team": team,
                "team_symbol": sym,
                "opponent": opp_name,
                "opponent_symbol": opp_sym,
                "total_runs": inn["total_runs"],
                "total_wickets": inn["total_wickets"],
                "run_rate": inn["run_rate"],
                "innings_number": idx + 1,
            },
        })

    return docs


def _player_docs(all_matches: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Aggregate player stats across all matches and generate per-player documents."""
    batting: dict[str, dict] = defaultdict(lambda: {
        "matches": 0, "innings": 0, "runs": 0, "balls": 0,
        "fours": 0, "sixes": 0, "outs": 0, "teams": set(),
        "high_score": 0, "scores": [],
    })
    bowling: dict[str, dict] = defaultdict(lambda: {
        "matches": 0, "innings": 0, "runs": 0, "balls": 0,
        "wickets": 0, "teams": set(), "best_wkt": 0, "best_runs": 999,
    })

    for m in all_matches:
        match_players_bat: set[str] = set()
        match_players_bowl: set[str] = set()
        for inn in m["innings"]:
            team = inn["team"]
            for name, stats in inn["all_batters"].items():
                batting[name]["runs"] += stats["runs"]
                batting[name]["balls"] += stats["balls"]
                batting[name]["fours"] += stats["fours"]
                batting[name]["sixes"] += stats["sixes"]
                if stats["out"]:
                    batting[name]["outs"] += 1
                batting[name]["teams"].add(team)
                batting[name]["innings"] += 1
                batting[name]["scores"].append(stats["runs"])
                if stats["runs"] > batting[name]["high_score"]:
                    batting[name]["high_score"] = stats["runs"]
                match_players_bat.add(name)

            for name, stats in inn["all_bowlers"].items():
                bowling[name]["runs"] += stats["runs"]
                bowling[name]["balls"] += stats["balls"]
                bowling[name]["wickets"] += stats["wickets"]
                bowling[name]["teams"].add(team)
                bowling[name]["innings"] += 1
                if stats["wickets"] > bowling[name]["best_wkt"] or (
                    stats["wickets"] == bowling[name]["best_wkt"]
                    and stats["runs"] < bowling[name]["best_runs"]
                ):
                    bowling[name]["best_wkt"] = stats["wickets"]
                    bowling[name]["best_runs"] = stats["runs"]
                match_players_bowl.add(name)

        for p in match_players_bat:
            batting[p]["matches"] += 1
        for p in match_players_bowl:
            bowling[p]["matches"] += 1

    # Generate documents for players with meaningful data
    docs: list[dict[str, Any]] = []
    all_players = set(batting.keys()) | set(bowling.keys())

    for player in sorted(all_players):
        lines: list[str] = [f"PSL Career Stats — {player}"]
        bat = batting.get(player)
        bowl = bowling.get(player)
        teams: set[str] = set()

        if bat and bat["innings"] > 0:
            teams.update(bat["teams"])
            avg = round(bat["runs"] / bat["outs"], 2) if bat["outs"] else float(bat["runs"])
            sr = round(bat["runs"] / bat["balls"] * 100, 1) if bat["balls"] else 0.0
            fifties = sum(1 for s in bat["scores"] if 50 <= s < 100)
            hundreds = sum(1 for s in bat["scores"] if s >= 100)
            lines.append(
                f"Batting: {bat['matches']} matches, {bat['innings']} innings, "
                f"{bat['runs']} runs, HS {bat['high_score']}, "
                f"Avg {avg}, SR {sr}, "
                f"{bat['fours']} fours, {bat['sixes']} sixes, "
                f"{fifties} fifties, {hundreds} hundreds."
            )

        if bowl and bowl["innings"] > 0 and bowl["wickets"] > 0:
            teams.update(bowl["teams"])
            econ = round(bowl["runs"] / (bowl["balls"] / 6), 2) if bowl["balls"] else 0.0
            avg_b = round(bowl["runs"] / bowl["wickets"], 2) if bowl["wickets"] else 0.0
            sr_b = round(bowl["balls"] / bowl["wickets"], 1) if bowl["wickets"] else 0.0
            best = f"{bowl['best_wkt']}/{bowl['best_runs']}"
            lines.append(
                f"Bowling: {bowl['innings']} innings, "
                f"{bowl['wickets']} wickets, Best {best}, "
                f"Avg {avg_b}, Econ {econ}, SR {sr_b}."
            )

        if len(lines) < 2:
            continue  # skip players with no meaningful stats

        team_list = ", ".join(sorted(teams))
        lines.insert(1, f"Teams: {team_list}")

        text = "\n".join(lines)
        sym_list = [_team_symbol(t) for t in sorted(teams)]

        docs.append({
            "id": f"player_{player.replace(' ', '_').lower()}",
            "text": text,
            "metadata": {
                "type": "player",
                "player_name": player,
                "teams": team_list,
                "team_symbols": ",".join(sym_list),
                "bat_runs": bat["runs"] if bat else 0,
                "bat_innings": bat["innings"] if bat else 0,
                "bowl_wickets": bowl["wickets"] if bowl else 0,
                "bowl_innings": bowl["innings"] if bowl else 0,
            },
        })

    return docs


# ── main ingestion pipeline ───────────────────────────────────────────────


def ingest_all(
    data_dir: Path | None = None,
    download: bool = True,
) -> dict[str, list[dict[str, Any]]]:
    """Run the full ingestion pipeline.

    Returns a dict with keys ``matches``, ``innings``, ``players`` — each
    containing a list of document dicts with ``id``, ``text``, ``metadata``.
    """
    if download:
        data_dir = download_cricsheet_data()
    elif data_dir is None:
        data_dir = RAW_DATA_DIR

    json_files = sorted(data_dir.rglob("*.json"))
    logger.info("Found %d JSON files to parse.", len(json_files))

    all_matches: list[dict[str, Any]] = []
    match_docs: list[dict[str, Any]] = []
    innings_docs: list[dict[str, Any]] = []

    for fp in json_files:
        parsed = parse_match_file(fp)
        if parsed is None:
            continue
        all_matches.append(parsed)
        match_docs.append(_match_doc(parsed))
        innings_docs.extend(_innings_docs(parsed))

    player_docs_list = _player_docs(all_matches)

    logger.info(
        "Ingestion complete: %d match docs, %d innings docs, %d player docs.",
        len(match_docs),
        len(innings_docs),
        len(player_docs_list),
    )

    return {
        "matches": match_docs,
        "innings": innings_docs,
        "players": player_docs_list,
    }


# ── fallback / demo data ─────────────────────────────────────────────────


def generate_demo_data() -> dict[str, list[dict[str, Any]]]:
    """Generate realistic demo data when Cricsheet download is unavailable."""
    logger.info("Generating demo PSL data for development/demo purposes.")

    demo_matches = [
        {
            "id": "match_demo_001",
            "text": (
                "PSL 2024 Match 1: Islamabad United (IU) vs Quetta Gladiators (QG) at "
                "National Stadium, Karachi on 2024-02-17. Toss: Islamabad United elected to bat. "
                "Islamabad United won by 25 runs. Player of the Match: Shadab Khan. "
                "1st Innings — Islamabad United: 185/4 (20 overs, RR 9.25). "
                "Top batters: Shadab Khan 67(42), Alex Hales 45(30), Azam Khan 38(18). "
                "Top bowlers: Naseem Shah 2/32, Mohammad Hasnain 1/38. "
                "2nd Innings — Quetta Gladiators: 160/8 (20 overs, RR 8.0). "
                "Top batters: Jason Roy 52(38), Sarfaraz Ahmed 35(28). "
                "Top bowlers: Shadab Khan 3/28, Faheem Ashraf 2/30."
            ),
            "metadata": {
                "type": "match", "match_id": "demo_001", "season": "2024",
                "date": "2024-02-17", "venue": "National Stadium, Karachi",
                "city": "Karachi", "team_a": "Islamabad United",
                "team_b": "Quetta Gladiators", "sym_a": "IU", "sym_b": "QG",
                "winner": "Islamabad United", "result": "Islamabad United won by 25 runs",
                "player_of_match": "Shadab Khan",
            },
        },
        {
            "id": "match_demo_002",
            "text": (
                "PSL 2024 Match 5: Lahore Qalandars (LQ) vs Multan Sultans (MS) at "
                "Gaddafi Stadium, Lahore on 2024-02-19. Toss: Multan Sultans elected to field. "
                "Lahore Qalandars won by 6 wickets. Player of the Match: Shaheen Shah Afridi. "
                "1st Innings — Multan Sultans: 148/9 (20 overs, RR 7.4). "
                "Top batters: Shan Masood 55(42), Rilee Rossouw 30(22). "
                "Top bowlers: Shaheen Shah Afridi 4/22, Haris Rauf 2/35. "
                "2nd Innings — Lahore Qalandars: 152/4 (18.3 overs, RR 8.22). "
                "Top batters: Fakhar Zaman 68(45), Abdullah Shafique 42(35). "
                "Top bowlers: David Willey 2/28."
            ),
            "metadata": {
                "type": "match", "match_id": "demo_002", "season": "2024",
                "date": "2024-02-19", "venue": "Gaddafi Stadium, Lahore",
                "city": "Lahore", "team_a": "Lahore Qalandars",
                "team_b": "Multan Sultans", "sym_a": "LQ", "sym_b": "MS",
                "winner": "Lahore Qalandars", "result": "Lahore Qalandars won by 6 wickets",
                "player_of_match": "Shaheen Shah Afridi",
            },
        },
        {
            "id": "match_demo_003",
            "text": (
                "PSL 2024 Match 10: Peshawar Zalmi (PZ) vs Karachi Kings (KK) at "
                "Rawalpindi Cricket Stadium, Rawalpindi on 2024-02-22. "
                "Toss: Peshawar Zalmi elected to bat. Peshawar Zalmi won by 32 runs. "
                "Player of the Match: Babar Azam. "
                "1st Innings — Peshawar Zalmi: 192/5 (20 overs, RR 9.6). "
                "Top batters: Babar Azam 82(52), Mohammad Haris 48(22). "
                "Top bowlers: Imad Wasim 2/34. "
                "2nd Innings — Karachi Kings: 160/7 (20 overs, RR 8.0). "
                "Top batters: James Vince 55(40), Imad Wasim 32(20). "
                "Top bowlers: Wahab Riaz 3/25, Mohammad Amir 2/32."
            ),
            "metadata": {
                "type": "match", "match_id": "demo_003", "season": "2024",
                "date": "2024-02-22", "venue": "Rawalpindi Cricket Stadium, Rawalpindi",
                "city": "Rawalpindi", "team_a": "Peshawar Zalmi",
                "team_b": "Karachi Kings", "sym_a": "PZ", "sym_b": "KK",
                "winner": "Peshawar Zalmi", "result": "Peshawar Zalmi won by 32 runs",
                "player_of_match": "Babar Azam",
            },
        },
        {
            "id": "match_demo_004",
            "text": (
                "PSL 2024 Match 15: Islamabad United (IU) vs Lahore Qalandars (LQ) at "
                "National Stadium, Karachi on 2024-02-26. Toss: Lahore Qalandars elected to field. "
                "Islamabad United won by 4 wickets. Player of the Match: Azam Khan. "
                "1st Innings — Lahore Qalandars: 175/6 (20 overs, RR 8.75). "
                "Top batters: Fakhar Zaman 72(48), Shaheen Shah Afridi 22(10). "
                "Top bowlers: Naseem Shah 2/30, Shadab Khan 2/35. "
                "2nd Innings — Islamabad United: 178/6 (19.4 overs, RR 9.05). "
                "Top batters: Azam Khan 65(32), Alex Hales 48(33). "
                "Top bowlers: Shaheen Shah Afridi 2/38, Haris Rauf 2/40."
            ),
            "metadata": {
                "type": "match", "match_id": "demo_004", "season": "2024",
                "date": "2024-02-26", "venue": "National Stadium, Karachi",
                "city": "Karachi", "team_a": "Islamabad United",
                "team_b": "Lahore Qalandars", "sym_a": "IU", "sym_b": "LQ",
                "winner": "Islamabad United", "result": "Islamabad United won by 4 wickets",
                "player_of_match": "Azam Khan",
            },
        },
        {
            "id": "match_demo_005",
            "text": (
                "PSL 2024 Match 20: Multan Sultans (MS) vs Quetta Gladiators (QG) at "
                "Multan Cricket Stadium, Multan on 2024-03-01. "
                "Toss: Quetta Gladiators elected to bat. Multan Sultans won by 8 wickets. "
                "Player of the Match: Mohammad Rizwan. "
                "1st Innings — Quetta Gladiators: 135/9 (20 overs, RR 6.75). "
                "Top batters: Sarfaraz Ahmed 40(32), Jason Roy 28(25). "
                "Top bowlers: Ihsanullah 3/18, Usama Mir 2/25. "
                "2nd Innings — Multan Sultans: 138/2 (16.2 overs, RR 8.45). "
                "Top batters: Mohammad Rizwan 72(50), Shan Masood 45(35). "
                "Top bowlers: Naseem Shah 1/28."
            ),
            "metadata": {
                "type": "match", "match_id": "demo_005", "season": "2024",
                "date": "2024-03-01", "venue": "Multan Cricket Stadium, Multan",
                "city": "Multan", "team_a": "Multan Sultans",
                "team_b": "Quetta Gladiators", "sym_a": "MS", "sym_b": "QG",
                "winner": "Multan Sultans", "result": "Multan Sultans won by 8 wickets",
                "player_of_match": "Mohammad Rizwan",
            },
        },
        {
            "id": "match_demo_006",
            "text": (
                "PSL 2023 Match 8: Islamabad United (IU) vs Quetta Gladiators (QG) at "
                "Gaddafi Stadium, Lahore on 2023-02-20. Toss: Quetta Gladiators elected to bat. "
                "Quetta Gladiators won by 5 wickets. Player of the Match: Jason Roy. "
                "1st Innings — Islamabad United: 165/7 (20 overs, RR 8.25). "
                "Top batters: Shadab Khan 48(35), Colin Munro 42(30). "
                "Top bowlers: Mohammad Nawaz 3/28, Naseem Shah 2/30. "
                "2nd Innings — Quetta Gladiators: 168/5 (19.2 overs, RR 8.69). "
                "Top batters: Jason Roy 78(52), Sarfaraz Ahmed 42(28). "
                "Top bowlers: Shadab Khan 2/32."
            ),
            "metadata": {
                "type": "match", "match_id": "demo_006", "season": "2023",
                "date": "2023-02-20", "venue": "Gaddafi Stadium, Lahore",
                "city": "Lahore", "team_a": "Islamabad United",
                "team_b": "Quetta Gladiators", "sym_a": "IU", "sym_b": "QG",
                "winner": "Quetta Gladiators", "result": "Quetta Gladiators won by 5 wickets",
                "player_of_match": "Jason Roy",
            },
        },
        {
            "id": "match_demo_007",
            "text": (
                "PSL 2023 Match 22: Lahore Qalandars (LQ) vs Peshawar Zalmi (PZ) at "
                "Gaddafi Stadium, Lahore on 2023-03-05. Toss: Lahore Qalandars elected to bat. "
                "Lahore Qalandars won by 68 runs. Player of the Match: Fakhar Zaman. "
                "1st Innings — Lahore Qalandars: 210/3 (20 overs, RR 10.5). "
                "Top batters: Fakhar Zaman 100(52), Abdullah Shafique 55(38). "
                "Top bowlers: Wahab Riaz 1/42. "
                "2nd Innings — Peshawar Zalmi: 142/9 (20 overs, RR 7.1). "
                "Top batters: Babar Azam 45(38), Mohammad Haris 30(15). "
                "Top bowlers: Shaheen Shah Afridi 3/20, Rashid Khan 3/25."
            ),
            "metadata": {
                "type": "match", "match_id": "demo_007", "season": "2023",
                "date": "2023-03-05", "venue": "Gaddafi Stadium, Lahore",
                "city": "Lahore", "team_a": "Lahore Qalandars",
                "team_b": "Peshawar Zalmi", "sym_a": "LQ", "sym_b": "PZ",
                "winner": "Lahore Qalandars", "result": "Lahore Qalandars won by 68 runs",
                "player_of_match": "Fakhar Zaman",
            },
        },
        {
            "id": "match_demo_008",
            "text": (
                "PSL 2023 Final: Lahore Qalandars (LQ) vs Multan Sultans (MS) at "
                "Gaddafi Stadium, Lahore on 2023-03-19. Toss: Multan Sultans elected to field. "
                "Lahore Qalandars won by 1 run. Player of the Match: Shaheen Shah Afridi. "
                "1st Innings — Lahore Qalandars: 180/5 (20 overs, RR 9.0). "
                "Top batters: Fakhar Zaman 62(40), Mohammad Hafeez 45(30). "
                "Top bowlers: David Willey 2/32, Khushdil Shah 1/35. "
                "2nd Innings — Multan Sultans: 179/8 (20 overs, RR 8.95). "
                "Top batters: Rilee Rossouw 65(42), Mohammad Rizwan 38(30). "
                "Top bowlers: Shaheen Shah Afridi 3/22, Haris Rauf 2/38."
            ),
            "metadata": {
                "type": "match", "match_id": "demo_008", "season": "2023",
                "date": "2023-03-19", "venue": "Gaddafi Stadium, Lahore",
                "city": "Lahore", "team_a": "Lahore Qalandars",
                "team_b": "Multan Sultans", "sym_a": "LQ", "sym_b": "MS",
                "winner": "Lahore Qalandars", "result": "Lahore Qalandars won by 1 run",
                "player_of_match": "Shaheen Shah Afridi",
            },
        },
    ]

    demo_innings = [
        {
            "id": "innings_demo_001_0",
            "text": (
                "PSL 2024, 2024-02-17 — Islamabad United (IU) innings vs Quetta Gladiators (QG) "
                "at National Stadium, Karachi. Total: 185/4 (20 overs). Run rate: 9.25. "
                "Powerplay (overs 1-6): 52/1 (RR 8.67). Middle (overs 7-15): 78/2 (RR 8.67). "
                "Death (overs 16-20): 55/1 (RR 11.0). "
                "Batting:\n  Shadab Khan: 67 off 42 balls (SR 159.5, 5x4, 4x6) (not out)\n"
                "  Alex Hales: 45 off 30 balls (SR 150.0, 6x4, 2x6) (caught)\n"
                "  Azam Khan: 38 off 18 balls (SR 211.1, 2x4, 3x6) (not out)\n"
                "Bowling:\n  Naseem Shah: 2/32 in 4 overs (Econ 8.0)\n"
                "  Mohammad Hasnain: 1/38 in 4 overs (Econ 9.5)"
            ),
            "metadata": {
                "type": "innings", "match_id": "demo_001", "season": "2024",
                "date": "2024-02-17", "venue": "National Stadium, Karachi",
                "team": "Islamabad United", "team_symbol": "IU",
                "opponent": "Quetta Gladiators", "opponent_symbol": "QG",
                "total_runs": 185, "total_wickets": 4, "run_rate": 9.25,
                "innings_number": 1,
            },
        },
        {
            "id": "innings_demo_001_1",
            "text": (
                "PSL 2024, 2024-02-17 — Quetta Gladiators (QG) innings vs Islamabad United (IU) "
                "at National Stadium, Karachi. Total: 160/8 (20 overs). Run rate: 8.0. "
                "Powerplay (overs 1-6): 38/2 (RR 6.33). Middle (overs 7-15): 72/3 (RR 8.0). "
                "Death (overs 16-20): 50/3 (RR 10.0). "
                "Batting:\n  Jason Roy: 52 off 38 balls (SR 136.8, 6x4, 2x6) (bowled)\n"
                "  Sarfaraz Ahmed: 35 off 28 balls (SR 125.0, 3x4, 1x6) (caught)\n"
                "Bowling:\n  Shadab Khan: 3/28 in 4 overs (Econ 7.0)\n"
                "  Faheem Ashraf: 2/30 in 4 overs (Econ 7.5)"
            ),
            "metadata": {
                "type": "innings", "match_id": "demo_001", "season": "2024",
                "date": "2024-02-17", "venue": "National Stadium, Karachi",
                "team": "Quetta Gladiators", "team_symbol": "QG",
                "opponent": "Islamabad United", "opponent_symbol": "IU",
                "total_runs": 160, "total_wickets": 8, "run_rate": 8.0,
                "innings_number": 2,
            },
        },
        {
            "id": "innings_demo_005_0",
            "text": (
                "PSL 2024, 2024-03-01 — Quetta Gladiators (QG) innings vs Multan Sultans (MS) "
                "at Multan Cricket Stadium, Multan. Total: 135/9 (20 overs). Run rate: 6.75. "
                "Powerplay (overs 1-6): 32/3 (RR 5.33). Middle (overs 7-15): 62/4 (RR 6.89). "
                "Death (overs 16-20): 41/2 (RR 8.2). "
                "Batting:\n  Sarfaraz Ahmed: 40 off 32 balls (SR 125.0, 4x4, 1x6) (caught)\n"
                "  Jason Roy: 28 off 25 balls (SR 112.0, 3x4, 0x6) (lbw)\n"
                "Bowling:\n  Ihsanullah: 3/18 in 4 overs (Econ 4.5)\n"
                "  Usama Mir: 2/25 in 4 overs (Econ 6.25)"
            ),
            "metadata": {
                "type": "innings", "match_id": "demo_005", "season": "2024",
                "date": "2024-03-01", "venue": "Multan Cricket Stadium, Multan",
                "team": "Quetta Gladiators", "team_symbol": "QG",
                "opponent": "Multan Sultans", "opponent_symbol": "MS",
                "total_runs": 135, "total_wickets": 9, "run_rate": 6.75,
                "innings_number": 1,
            },
        },
    ]

    demo_players = [
        {
            "id": "player_shadab_khan",
            "text": (
                "PSL Career Stats — Shadab Khan\n"
                "Teams: Islamabad United\n"
                "Batting: 85 matches, 78 innings, 1450 runs, HS 91, "
                "Avg 24.58, SR 142.5, 120 fours, 55 sixes, 8 fifties, 0 hundreds.\n"
                "Bowling: 82 innings, 95 wickets, Best 4/14, "
                "Avg 22.8, Econ 7.15, SR 19.1."
            ),
            "metadata": {
                "type": "player", "player_name": "Shadab Khan",
                "teams": "Islamabad United", "team_symbols": "IU",
                "bat_runs": 1450, "bat_innings": 78, "bowl_wickets": 95, "bowl_innings": 82,
            },
        },
        {
            "id": "player_shaheen_shah_afridi",
            "text": (
                "PSL Career Stats — Shaheen Shah Afridi\n"
                "Teams: Lahore Qalandars\n"
                "Batting: 72 matches, 30 innings, 180 runs, HS 32, "
                "Avg 12.0, SR 155.2, 15 fours, 10 sixes, 0 fifties, 0 hundreds.\n"
                "Bowling: 70 innings, 92 wickets, Best 5/20, "
                "Avg 20.5, Econ 7.45, SR 16.5."
            ),
            "metadata": {
                "type": "player", "player_name": "Shaheen Shah Afridi",
                "teams": "Lahore Qalandars", "team_symbols": "LQ",
                "bat_runs": 180, "bat_innings": 30, "bowl_wickets": 92, "bowl_innings": 70,
            },
        },
        {
            "id": "player_babar_azam",
            "text": (
                "PSL Career Stats — Babar Azam\n"
                "Teams: Islamabad United, Karachi Kings, Peshawar Zalmi\n"
                "Batting: 75 matches, 74 innings, 2300 runs, HS 114, "
                "Avg 38.3, SR 128.5, 210 fours, 65 sixes, 18 fifties, 2 hundreds.\n"
                "Bowling: 5 innings, 1 wickets, Best 1/15, "
                "Avg 42.0, Econ 7.0, SR 36.0."
            ),
            "metadata": {
                "type": "player", "player_name": "Babar Azam",
                "teams": "Islamabad United, Karachi Kings, Peshawar Zalmi",
                "team_symbols": "IU,KK,PZ",
                "bat_runs": 2300, "bat_innings": 74, "bowl_wickets": 1, "bowl_innings": 5,
            },
        },
        {
            "id": "player_fakhar_zaman",
            "text": (
                "PSL Career Stats — Fakhar Zaman\n"
                "Teams: Lahore Qalandars, Quetta Gladiators\n"
                "Batting: 70 matches, 68 innings, 2100 runs, HS 114, "
                "Avg 33.3, SR 138.2, 185 fours, 80 sixes, 15 fifties, 2 hundreds.\n"
                "Bowling: 0 innings, 0 wickets."
            ),
            "metadata": {
                "type": "player", "player_name": "Fakhar Zaman",
                "teams": "Lahore Qalandars, Quetta Gladiators",
                "team_symbols": "LQ,QG",
                "bat_runs": 2100, "bat_innings": 68, "bowl_wickets": 0, "bowl_innings": 0,
            },
        },
        {
            "id": "player_mohammad_rizwan",
            "text": (
                "PSL Career Stats — Mohammad Rizwan\n"
                "Teams: Multan Sultans, Karachi Kings\n"
                "Batting: 68 matches, 67 innings, 1980 runs, HS 89, "
                "Avg 35.4, SR 130.8, 175 fours, 50 sixes, 14 fifties, 0 hundreds.\n"
                "Bowling: 0 innings, 0 wickets."
            ),
            "metadata": {
                "type": "player", "player_name": "Mohammad Rizwan",
                "teams": "Multan Sultans, Karachi Kings",
                "team_symbols": "MS,KK",
                "bat_runs": 1980, "bat_innings": 67, "bowl_wickets": 0, "bowl_innings": 0,
            },
        },
        {
            "id": "player_haris_rauf",
            "text": (
                "PSL Career Stats — Haris Rauf\n"
                "Teams: Lahore Qalandars\n"
                "Batting: 60 matches, 15 innings, 50 runs, HS 18, "
                "Avg 5.0, SR 166.7, 5 fours, 3 sixes, 0 fifties, 0 hundreds.\n"
                "Bowling: 58 innings, 78 wickets, Best 4/22, "
                "Avg 24.2, Econ 8.35, SR 17.4."
            ),
            "metadata": {
                "type": "player", "player_name": "Haris Rauf",
                "teams": "Lahore Qalandars", "team_symbols": "LQ",
                "bat_runs": 50, "bat_innings": 15, "bowl_wickets": 78, "bowl_innings": 58,
            },
        },
        {
            "id": "player_naseem_shah",
            "text": (
                "PSL Career Stats — Naseem Shah\n"
                "Teams: Quetta Gladiators, Islamabad United\n"
                "Batting: 45 matches, 12 innings, 35 runs, HS 12, "
                "Avg 4.4, SR 120.7, 3 fours, 1 sixes, 0 fifties, 0 hundreds.\n"
                "Bowling: 44 innings, 55 wickets, Best 4/18, "
                "Avg 22.5, Econ 7.8, SR 17.3."
            ),
            "metadata": {
                "type": "player", "player_name": "Naseem Shah",
                "teams": "Quetta Gladiators, Islamabad United",
                "team_symbols": "QG,IU",
                "bat_runs": 35, "bat_innings": 12, "bowl_wickets": 55, "bowl_innings": 44,
            },
        },
    ]

    return {
        "matches": demo_matches,
        "innings": demo_innings,
        "players": demo_players,
    }


# ── CLI entry ─────────────────────────────────────────────────────────────


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

    use_demo = "--demo" in sys.argv
    if use_demo:
        docs = generate_demo_data()
    else:
        docs = ingest_all(download=True)

    for collection, items in docs.items():
        print(f"\n{'='*60}")
        print(f"Collection: {collection} — {len(items)} documents")
        print(f"{'='*60}")
        for item in items[:2]:
            print(f"\n--- {item['id']} ---")
            print(item["text"][:300] + "..." if len(item["text"]) > 300 else item["text"])
