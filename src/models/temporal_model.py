import torch
import torch.nn as nn

class TemporalModel(nn.Module):
    def __init__(self, input_size):
        super().__init__()
        self.gru = nn.GRU(input_size, 64, batch_first=True)

        # Heads
        self.forecast_head = nn.Linear(64, 1)
        self.risk_head = nn.Sequential(
            nn.Linear(64, 1),
            nn.Sigmoid()
        )
        self.regime_head = nn.Linear(64, 5)

    def forward(self, x):
        _, h = self.gru(x)
        h = h[-1]

        forecast = self.forecast_head(h)
        risk = self.risk_head(h)
        regime = self.regime_head(h)

        return forecast, risk, regime


def train_model(model, X, y, epochs=15, lr=1e-3):
    """
    Self-supervised training:
    X -> past window
    y -> next-step load
    """
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)

    model.train()

    for epoch in range(epochs):
        optimizer.zero_grad()

        forecast, _, _ = model(X)
        loss = criterion(forecast, y)

        loss.backward()
        optimizer.step()

        if epoch % 2 == 0:
            print(f"[TRAIN] Epoch {epoch} | Loss: {loss.item():.4f}")

    return model
