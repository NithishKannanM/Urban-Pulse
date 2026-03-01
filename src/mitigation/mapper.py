def map_mitigation(action, regime_level):

    if action == "MONITOR":
        return {
            "level": "Observation",
            "operations": [
                "Track load and voltage trends",
                "Log anomalies",
                "Monitor carbon intensity",
                "Passive thermal observation"
            ]
        }

    if action == "PREPARE":
        return {
            "level": "Preventive Stabilization",
            "operations": [
                "Shift load to secondary feeders",
                "Adjust transformer tap settings",
                "Reduce non-critical loads",
                "Throttle HVAC",
                "Prepare battery backup systems",
                "Flag maintenance review"
            ]
        }

    if action == "INTERVENE":
        return {
            "level": "Active Mitigation",
            "operations": [
                "Initiate load shedding",
                "Activate generators",
                "Engage battery discharge",
                "Force feeder redistribution",
                "Emergency cooling protocol",
                "Escalate to control center"
            ]
        }