def decide(risk_score, regime_level):
    if regime_level >= 4 or risk_score > 0.8:
        return {
            "action": "INTERVENE",
            "priority": "P1",
            "confidence": float(risk_score),
            "regret": {"act": "low", "wait": "high"}
        }

    if regime_level >= 2 or risk_score > 0.5:
        return {
            "action": "PREPARE",
            "priority": "P2",
            "confidence": float(risk_score),
            "regret": {"act": "medium", "wait": "high"}
        }

    return {
        "action": "MONITOR",
        "priority": "P3",
        "confidence": float(risk_score),
        "regret": {"act": "low", "wait": "low"}
    }
