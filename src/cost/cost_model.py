from config.constants import (
    ELECTRICITY_PRICE,
    CARBON_INTENSITY,
    CARBON_PRICE,
    TIME_WINDOW_HOURS,
)


def compute_failure_loss(delta_p: float) -> dict:
    """
    Estimate economic and environmental loss if overload occurs.

    Parameters
    ----------
    delta_p : float
        Predicted overload magnitude in kW.

    Returns
    -------
    dict
        {
            energy_imbalance_kWh,
            carbon_emission_kg,
            energy_cost,
            carbon_cost,
            total_loss
        }
    """

    # -------- Input Safety --------
    if delta_p is None:
        raise ValueError("delta_p cannot be None")

    delta_p = float(abs(delta_p))

    # -------- Energy Imbalance --------
    energy_imbalance = delta_p * float(TIME_WINDOW_HOURS)

    # -------- Energy Cost --------
    energy_cost = energy_imbalance * float(ELECTRICITY_PRICE)

    # -------- Carbon Emission --------
    carbon_emission = energy_imbalance * float(CARBON_INTENSITY)

    # -------- Carbon Cost --------
    carbon_cost = carbon_emission * float(CARBON_PRICE)

    # -------- Total Loss --------
    total_loss = energy_cost + carbon_cost

    return {
        "energy_imbalance_kWh": float(energy_imbalance),
        "carbon_emission_kg": float(carbon_emission),
        "energy_cost": float(energy_cost),
        "carbon_cost": float(carbon_cost),
        "total_loss": float(total_loss),
    }