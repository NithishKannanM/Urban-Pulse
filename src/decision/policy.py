from config.constants import INTERVENTION_COST
from src.cost.cost_model import compute_failure_loss


# Minimum financial impact to justify preparation
MIN_ACTIONABLE_LOSS = 5.0   # ₹ (tunable threshold)


def decide(risk_score: float, regime_level: int, signals: dict) -> dict:
    """
    Cost-aware decision engine.

    Parameters
    ----------
    risk_score : float
        Failure probability (0–1).
    regime_level : int
        0–4 system state classification.
    signals : dict
        Must include 'prediction_error'.

    Returns
    -------
    dict
        Structured decision output.
    """

    if "prediction_error" not in signals:
        raise ValueError("Signals must include 'prediction_error'.")

    delta_p = abs(float(signals["prediction_error"]))

    # ---- Compute theoretical failure loss ----
    loss_info = compute_failure_loss(delta_p)

    # Expected cost if we WAIT
    expected_wait_loss = risk_score * loss_info["total_loss"]

    # ---- Decision Logic ----
    if expected_wait_loss > INTERVENTION_COST:
        action = "INTERVENE"
        priority = "P1"

    elif expected_wait_loss > MIN_ACTIONABLE_LOSS or regime_level >= 2:
        action = "PREPARE"
        priority = "P2"

    else:
        action = "MONITOR"
        priority = "P3"

    return {
        "action": action,
        "priority": priority,
        "confidence": float(risk_score),
        "expected_wait_loss": float(expected_wait_loss),
        "intervention_cost": float(INTERVENTION_COST),
        **loss_info
    }