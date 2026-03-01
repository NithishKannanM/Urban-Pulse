import torch
import numpy as np

from src.firebase_client import initialize_firebase, push_raw_log, push_decision
from src.data.loader import load_logs
from src.data.features import build_windows
from src.models.temporal_model import TemporalModel
from src.signals.signal_builder import compute_signals
from src.decision.policy import decide
from src.mitigation.mapper import map_mitigation
from src.reasoning.llm_reasoner import explain

WINDOW = 30


def run_pipeline(data_path):

    # -------- INITIALIZE FIREBASE --------
    db = initialize_firebase()

    # -------- LOAD DATA --------
    df, feature_cols = load_logs(data_path)
    values = df[feature_cols].values

    # -------- LOAD MODEL --------
    model = TemporalModel(input_size=len(feature_cols))
    model.load_state_dict(torch.load("temporal_model.pt", weights_only=True))
    model.eval()

    # -------- STREAM LOOP --------
    for i in range(WINDOW, len(df)):

        current_row = df.iloc[i]

        # ==============================
        # 1️⃣ RAW LOG PUSH
        # ==============================
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

        # ==============================
        # 2️⃣ BUILD MODEL WINDOW
        # ==============================
        window = values[i - WINDOW:i]
        X = torch.tensor(
            window.reshape(1, WINDOW, -1),
            dtype=torch.float32
        )

        with torch.no_grad():
            forecast, risk, regime = model(X)

        # Handle batch dimension
        forecast = forecast[0]
        risk = risk[0]
        regime = regime[0]

        regime_level = int(torch.argmax(regime).item())
        risk_score = float(risk.item())

        # ==============================
        # 3️⃣ SIGNAL COMPUTATION
        # ==============================
        signals = compute_signals(
            forecast.item(),
            df["Power Consumption (kW)"].values[i - WINDOW:i]
        )

        # ==============================
        # 4️⃣ COST-AWARE DECISION ENGINE
        # ==============================
        decision = decide(
            risk_score,
            regime_level,
            signals
        )

        # ==============================
        # 5️⃣ MITIGATION MAPPING
        # ==============================
        mitigation = map_mitigation(
            decision["action"],
            regime_level
        )

        # ==============================
        # 6️⃣ OPTIONAL LLM EXPLANATION
        # ==============================
        if decision["priority"] in ["P1", "P2"]:
            explanation = explain({
                "regime": regime_level,
                "risk_score": risk_score,
                "action": decision["action"],
                "priority": decision["priority"]
            })
        else:
            explanation = None

        # ==============================
        # 7️⃣ FINAL DECISION LOG
        # ==============================
        decision_log = {
            "timestamp": str(current_row["Timestamp"]),
            "regime": regime_level,
            "risk_score": risk_score,
            "signals": signals,
            "decision": decision,
            "mitigation": mitigation,
            "explanation": explanation
        }

        push_decision(db, decision_log)

        print("Pushing raw log:", raw_log["timestamp"])
        print("Pushing decision:", decision["action"])

    return {"status": "Streaming complete"}