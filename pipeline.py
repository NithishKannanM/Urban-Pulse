import torch
import numpy as np
from src.firebase_client import initialize_firebase, push_raw_log, push_decision
from src.data.loader import load_logs
from src.data.features import build_windows
from src.models.temporal_model import TemporalModel
from src.signals.signal_builder import compute_signals
from src.decision.policy import decide
from src.reasoning.llm_reasoner import explain
# import time
# time.sleep(1)


WINDOW = 30

def run_pipeline(data_path):
    db = initialize_firebase()
    df, feature_cols = load_logs(data_path)

    model = TemporalModel(input_size=len(feature_cols))
    model.load_state_dict(torch.load("temporal_model.pt", weights_only=True))
    model.eval()

    values = df[feature_cols].values

    for i in range(WINDOW, len(df)):

        # ----- RAW LOG -----
        current_row = df.iloc[i]

        raw_log = {
            "timestamp": str(current_row["Timestamp"]),
            "voltage": float(current_row["Voltage (V)"]),
            "current": float(current_row["Current (A)"]),
            "power": float(current_row["Power Consumption (kW)"]),
            "reactive_power": float(current_row["Reactive Power (kVAR)"]),
            "pf": float(current_row["Power Factor"]),
            "temp": float(current_row["Temperature (°C)"]),
            "fluctuation": float(current_row["Voltage Fluctuation (%)"]),
        }

        push_raw_log(db, raw_log)

        # ----- WINDOW FOR MODEL -----
        window = values[i-WINDOW:i]
        X = torch.tensor(window.reshape(1, WINDOW, -1), dtype=torch.float32)

        with torch.no_grad():
            forecast, risk, regime = model(X)

        forecast = forecast[0]
        risk = risk[0]
        regime = regime[0]

        regime_level = int(torch.argmax(regime).item())
        risk_score = float(risk.item())

        signals = compute_signals(
            forecast.item(),
            df["Power Consumption (kW)"].values[i-WINDOW:i]
        )

        decision = decide(risk_score, regime_level)

        explanation = explain({
            "regime": regime_level,
            "risk_score": risk_score,
            "action": decision["action"],
            "priority": decision["priority"]
        })

        decision_log = {
            "timestamp": str(current_row["Timestamp"]),
            "regime": regime_level,
            "risk_score": risk_score,
            "signals": signals,
            "decision": decision,
            "explanation": explanation
        }

        push_decision(db, decision_log)

    return {"status": "Streaming complete"}