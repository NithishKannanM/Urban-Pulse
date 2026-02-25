def explain(context):
    if context["priority"] == "P3":
        return None

    REGIME_MAP = {
        0: "Stable",
        1: "Accelerating",
        2: "Volatile",
        3: "Unstable",
        4: "Critical"
    }

    regime_name = REGIME_MAP.get(context["regime"], "Unknown")

    return (
        f"System entered {regime_name} regime with risk "
        f"{context['risk_score']:.2f}. "
        f"Action {context['action']} is recommended to minimize operational regret."
    )
