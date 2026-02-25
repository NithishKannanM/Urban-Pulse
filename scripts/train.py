import torch
from src.data.loader import load_logs
from src.data.features import build_windows
from src.models.temporal_model import TemporalModel, train_model

WINDOW = 30

def create_training_data(df, feature_cols):
    X, y = [], []
    values = df[feature_cols].values
    load_idx = feature_cols.index("Power Consumption (kW)")

    for i in range(WINDOW, len(values) - 1):
        X.append(values[i - WINDOW:i])
        y.append(values[i, load_idx])

    return torch.tensor(X, dtype=torch.float32), torch.tensor(y, dtype=torch.float32)


if __name__ == "__main__":
    df, feature_cols = load_logs("dataset/smart_grid_dataset.csv")

    X_train, y_train = create_training_data(df, feature_cols)

    model = TemporalModel(input_size=len(feature_cols))
    model = train_model(model, X_train, y_train)

    torch.save(model.state_dict(), "temporal_model.pt")
