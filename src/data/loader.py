import pandas as pd
from sklearn.preprocessing import StandardScaler

FEATURE_COLS = [
    "Voltage (V)",
    "Current (A)",
    "Power Consumption (kW)",
    "Reactive Power (kVAR)",
    "Power Factor",
    "Voltage Fluctuation (%)",
    "Temperature (°C)"
]

def load_logs(path):
    df = pd.read_csv(path)
    df["Timestamp"] = pd.to_datetime(df["Timestamp"])
    df = df.sort_values("Timestamp").reset_index(drop=True)
    df = df.dropna(subset=FEATURE_COLS)

    scaler = StandardScaler()
    df[FEATURE_COLS] = scaler.fit_transform(df[FEATURE_COLS])

    return df, FEATURE_COLS
