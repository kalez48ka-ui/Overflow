"""
Overflow AI Engine — Win Probability Model.

Logistic regression model for live T20 win probability estimation.
Trained on PSL Cricsheet data, features include current score, wickets,
overs bowled, required run rate (2nd innings), and venue factors.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import pickle
from pathlib import Path
from typing import Any

import numpy as np

from config import MODEL_DIR

logger = logging.getLogger(__name__)

MODEL_PATH = MODEL_DIR / "win_prob_model.pkl"
SCALER_PATH = MODEL_DIR / "win_prob_scaler.pkl"

_PICKLE_HMAC_DEFAULT = "overflow-ai-model-v1"
_PICKLE_SECRET = os.getenv("PICKLE_HMAC_SECRET", _PICKLE_HMAC_DEFAULT).encode()
if os.getenv("PICKLE_HMAC_SECRET") is None:
    logging.getLogger(__name__).warning(
        "PICKLE_HMAC_SECRET not set — using default. Set this env var in production."
    )


def _compute_file_hmac(path: Path) -> str:
    """Compute HMAC-SHA256 of a file."""
    h = hmac.new(_PICKLE_SECRET, digestmod=hashlib.sha256)
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


class WinProbabilityModel:
    """Logistic regression model for T20 cricket win probability.

    Features (8-dimensional):
        0. score               — runs scored so far
        1. wickets             — wickets fallen
        2. overs               — overs bowled (e.g. 12.3 -> 12.5)
        3. balls_remaining     — balls left in the innings
        4. run_rate            — current run rate
        5. required_rate       — required run rate (0 if 1st innings)
        6. wickets_in_hand     — 10 - wickets
        7. innings             — 1 or 2

    Target: 1 = batting team wins, 0 = batting team loses.
    """

    FEATURE_NAMES = [
        "score", "wickets", "overs", "balls_remaining",
        "run_rate", "required_rate", "wickets_in_hand", "innings",
    ]

    def __init__(self) -> None:
        self._model: Any = None
        self._scaler: Any = None
        self._fitted = False

    @property
    def is_fitted(self) -> bool:
        return self._fitted

    # ── feature engineering ────────────────────────────────────────────

    @staticmethod
    def _make_features(
        score: int,
        wickets: int,
        overs: float,
        target: int | None,
        innings: int,
    ) -> np.ndarray:
        """Convert raw match state into a feature vector."""
        # Convert overs to proper ball count: 12.3 -> 12 overs + 3 balls = 75 balls
        full_overs = int(overs)
        partial_balls = round((overs - full_overs) * 10)
        if partial_balls > 5:
            partial_balls = 5  # Clamp invalid partial overs
        balls_bowled = full_overs * 6 + partial_balls
        balls_remaining = max(0, 120 - balls_bowled)
        overs_decimal = balls_bowled / 6 if balls_bowled > 0 else 0.1

        run_rate = score / overs_decimal if overs_decimal > 0 else 0.0
        wickets_in_hand = 10 - wickets

        if innings == 2 and target is not None and balls_remaining > 0:
            runs_needed = max(0, target - score)
            required_rate = runs_needed / (balls_remaining / 6)
        else:
            required_rate = 0.0

        return np.array([
            score,
            wickets,
            overs_decimal,
            balls_remaining,
            run_rate,
            required_rate,
            wickets_in_hand,
            innings,
        ], dtype=np.float64).reshape(1, -1)

    # ── training ───────────────────────────────────────────────────────

    def train(self, match_data: list[dict[str, Any]] | None = None) -> dict[str, float]:
        """Train the logistic regression model on PSL match data.

        If no data is provided, generates synthetic training data from
        typical PSL match patterns.

        Returns training metrics.
        """
        from sklearn.linear_model import LogisticRegression
        from sklearn.model_selection import cross_val_score
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import StandardScaler

        X, y = self._prepare_training_data(match_data)

        # Cross-validate using a pipeline (scaler fits only on training folds)
        pipeline = Pipeline([
            ("scaler", StandardScaler()),
            ("model", LogisticRegression(
                C=1.0, max_iter=1000, class_weight="balanced", random_state=42,
            )),
        ])
        scores = cross_val_score(pipeline, X, y, cv=5, scoring="accuracy")
        roc_scores = cross_val_score(pipeline, X, y, cv=5, scoring="roc_auc")

        # Now fit the actual model on all data for production use
        self._scaler = StandardScaler()
        X_scaled = self._scaler.fit_transform(X)
        self._model = LogisticRegression(
            C=1.0,
            max_iter=1000,
            class_weight="balanced",
            random_state=42,
        )
        self._model.fit(X_scaled, y)
        self._fitted = True

        metrics = {
            "accuracy_mean": round(float(scores.mean()), 4),
            "accuracy_std": round(float(scores.std()), 4),
            "roc_auc_mean": round(float(roc_scores.mean()), 4),
            "roc_auc_std": round(float(roc_scores.std()), 4),
            "n_samples": len(y),
            "n_features": X.shape[1],
            "positive_rate": round(float(y.mean()), 4),
        }

        logger.info("Model trained: %s", metrics)
        return metrics

    def _prepare_training_data(
        self, match_data: list[dict[str, Any]] | None
    ) -> tuple[np.ndarray, np.ndarray]:
        """Prepare training data from match records or generate synthetic data."""
        if match_data:
            return self._extract_from_matches(match_data)
        return self._generate_synthetic_data()

    def _extract_from_matches(
        self, matches: list[dict[str, Any]]
    ) -> tuple[np.ndarray, np.ndarray]:
        """Extract training samples from parsed match data.

        For each match, sample multiple points along the innings to create
        training instances at different stages of the game.
        """
        X_list: list[np.ndarray] = []
        y_list: list[int] = []

        for m in matches:
            innings_data = m.get("innings", [])
            winner = m.get("winner", "")
            if not winner or len(innings_data) < 2:
                continue

            first_inn = innings_data[0]
            second_inn = innings_data[1]
            target = first_inn["total_runs"] + 1

            # Sample points from 1st innings
            for checkpoint_overs in [3.0, 6.0, 10.0, 15.0, 18.0, 20.0]:
                simulated_score = int(first_inn["total_runs"] * (checkpoint_overs / 20))
                simulated_wickets = min(
                    first_inn["total_wickets"],
                    int(first_inn["total_wickets"] * (checkpoint_overs / 20))
                )
                batting_wins = int(first_inn["team"] == winner or winner in first_inn["team"])

                features = self._make_features(
                    score=simulated_score,
                    wickets=simulated_wickets,
                    overs=checkpoint_overs,
                    target=None,
                    innings=1,
                )
                X_list.append(features)
                y_list.append(batting_wins)

            # Sample points from 2nd innings
            for checkpoint_overs in [3.0, 6.0, 10.0, 15.0, 18.0]:
                progress = checkpoint_overs / 20
                simulated_score = int(second_inn["total_runs"] * progress)
                simulated_wickets = min(
                    second_inn["total_wickets"],
                    int(second_inn["total_wickets"] * progress)
                )
                batting_wins = int(second_inn["team"] == winner or winner in second_inn["team"])

                features = self._make_features(
                    score=simulated_score,
                    wickets=simulated_wickets,
                    overs=checkpoint_overs,
                    target=target,
                    innings=2,
                )
                X_list.append(features)
                y_list.append(batting_wins)

        if not X_list:
            logger.warning("No training data extracted from matches — using synthetic data.")
            return self._generate_synthetic_data()

        X = np.vstack(X_list)
        y = np.array(y_list, dtype=np.int32)
        logger.info("Extracted %d training samples from %d matches.", len(y), len(matches))
        return X, y

    def _generate_synthetic_data(self) -> tuple[np.ndarray, np.ndarray]:
        """Generate synthetic training data based on typical PSL match patterns."""
        rng = np.random.RandomState(42)
        n_samples = 5000

        X_list: list[np.ndarray] = []
        y_list: list[int] = []

        for _ in range(n_samples):
            innings = rng.choice([1, 2])
            # Generate valid cricket overs (balls 6-120, then convert)
            total_balls = rng.randint(6, 121)
            full_overs = total_balls // 6
            partial = total_balls % 6
            overs = float(f"{full_overs}.{partial}")

            # Realistic score generation
            base_rr = rng.normal(8.0, 1.5)
            score = max(0, int(base_rr * overs + rng.normal(0, 10)))

            # Wickets: more likely to fall in death overs
            wicket_rate = 0.4 + (overs / 20) * 0.3
            wickets = min(10, int(rng.poisson(wicket_rate * overs / 3)))

            if innings == 2:
                target = max(score + 1, int(rng.normal(165, 20)))
            else:
                target = None

            features = self._make_features(score, wickets, overs, target, innings)

            # Generate outcome based on realistic probabilities
            # Use actual ball count for arithmetic (overs is cricket-format, not decimal)
            decimal_overs = total_balls / 6
            if innings == 1:
                projected = score / decimal_overs * 20 if decimal_overs > 0 else 160
                projected -= wickets * 4
                win_prob = 1 / (1 + np.exp(-(projected - 165) / 15))
            else:
                runs_needed = (target or 165) - score
                balls_left = max(1, 120 - total_balls)
                rrr = runs_needed / (balls_left / 6)
                resource_factor = (10 - wickets) / 10
                win_prob = 1 / (1 + np.exp((rrr - 8.0) / 2)) * resource_factor

            outcome = int(rng.random() < win_prob)

            X_list.append(features)
            y_list.append(outcome)

        X = np.vstack(X_list)
        y = np.array(y_list, dtype=np.int32)
        logger.info("Generated %d synthetic training samples.", n_samples)
        return X, y

    # ── prediction ─────────────────────────────────────────────────────

    def predict(
        self,
        score: int,
        wickets: int,
        overs: float,
        target: int | None = None,
        innings: int = 1,
    ) -> float:
        """Predict win probability for the batting team.

        Returns a float between 0 and 1.
        """
        if not self._fitted:
            raise RuntimeError("Model not fitted. Call train() or load() first.")

        features = self._make_features(score, wickets, overs, target, innings)
        features_scaled = self._scaler.transform(features)
        prob = self._model.predict_proba(features_scaled)[0][1]
        return float(prob)

    def predict_trajectory(
        self,
        score: int,
        wickets: int,
        overs: float,
        target: int | None = None,
        innings: int = 1,
        steps: int = 10,
    ) -> list[dict[str, float]]:
        """Predict win probability at future checkpoints.

        Projects forward assuming current run rate and wicket rate continue.
        Returns a list of {overs, win_prob} dicts.
        """
        if not self._fitted:
            raise RuntimeError("Model not fitted. Call train() or load() first.")

        current_rr = score / overs if overs > 0 else 7.5
        wicket_rate = wickets / overs if overs > 0 else 0.3

        max_overs = 20.0
        remaining = max_overs - overs
        step_size = remaining / steps if steps > 0 else 1.0

        trajectory: list[dict[str, float]] = []
        for i in range(steps + 1):
            # Snap to valid cricket overs
            future_balls = min(int(max_overs * 6), int(overs * 6) + int(i * step_size * 6))
            future_full = future_balls // 6
            future_partial = future_balls % 6
            future_overs = float(f"{future_full}.{future_partial}")
            extra_overs = future_overs - overs
            proj_score = int(score + current_rr * extra_overs)
            proj_wickets = min(10, int(wickets + wicket_rate * extra_overs))

            prob = self.predict(proj_score, proj_wickets, future_overs, target, innings)
            trajectory.append({
                "overs": round(future_overs, 1),
                "win_probability": round(prob * 100, 1),
            })

        return trajectory

    # ── persistence ────────────────────────────────────────────────────

    def save(self) -> None:
        """Save model and scaler to disk."""
        if not self._fitted:
            raise RuntimeError("Cannot save unfitted model.")

        MODEL_DIR.mkdir(parents=True, exist_ok=True)

        with open(MODEL_PATH, "wb") as f:
            pickle.dump(self._model, f)
        Path(f"{MODEL_PATH}.sig").write_text(_compute_file_hmac(MODEL_PATH))

        with open(SCALER_PATH, "wb") as f:
            pickle.dump(self._scaler, f)
        Path(f"{SCALER_PATH}.sig").write_text(_compute_file_hmac(SCALER_PATH))

        logger.info("Model saved to %s", MODEL_DIR)

    def load(self) -> bool:
        """Load model and scaler from disk. Returns True if successful."""
        if not MODEL_PATH.exists() or not SCALER_PATH.exists():
            logger.warning("No saved model found at %s — train first.", MODEL_DIR)
            return False

        try:
            # Verify HMAC signatures before loading pickle files
            for pkl_path in (MODEL_PATH, SCALER_PATH):
                sig_path = Path(f"{pkl_path}.sig")
                if not sig_path.exists():
                    logger.warning("Missing signature file %s — refusing to load untrusted pickle.", sig_path)
                    return False
                expected_hmac = sig_path.read_text().strip()
                actual_hmac = _compute_file_hmac(pkl_path)
                if not hmac.compare_digest(expected_hmac, actual_hmac):
                    logger.warning("HMAC mismatch for %s — file may be tampered. Retrain required.", pkl_path)
                    return False

            with open(MODEL_PATH, "rb") as f:
                self._model = pickle.load(f)
            with open(SCALER_PATH, "rb") as f:
                self._scaler = pickle.load(f)
            self._fitted = True
            logger.info("Model loaded from %s", MODEL_DIR)
            return True
        except Exception as exc:
            logger.error("Failed to load model: %s", exc)
            return False

    def train_and_save(self, match_data: list[dict[str, Any]] | None = None) -> dict[str, float]:
        """Convenience method: train then save."""
        metrics = self.train(match_data)
        self.save()
        return metrics


# ── CLI ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

    model = WinProbabilityModel()

    print("Training model with synthetic data...")
    metrics = model.train_and_save()
    print(f"Training metrics: {json.dumps(metrics, indent=2)}")

    # Demo predictions
    test_cases = [
        {"score": 50, "wickets": 1, "overs": 6.0, "target": None, "innings": 1},
        {"score": 120, "wickets": 3, "overs": 15.0, "target": None, "innings": 1},
        {"score": 180, "wickets": 5, "overs": 20.0, "target": None, "innings": 1},
        {"score": 80, "wickets": 2, "overs": 10.0, "target": 175, "innings": 2},
        {"score": 140, "wickets": 6, "overs": 17.0, "target": 185, "innings": 2},
        {"score": 50, "wickets": 5, "overs": 8.0, "target": 190, "innings": 2},
    ]

    print("\nPredictions:")
    print(f"{'Score':>8} {'Wkts':>5} {'Overs':>6} {'Target':>7} {'Inn':>4} {'Win%':>6}")
    print("-" * 40)
    for tc in test_cases:
        prob = model.predict(**tc)
        target_str = str(tc["target"]) if tc["target"] else "-"
        print(
            f"{tc['score']:>8} {tc['wickets']:>5} {tc['overs']:>6.1f} "
            f"{target_str:>7} {tc['innings']:>4} {prob*100:>5.1f}%"
        )
