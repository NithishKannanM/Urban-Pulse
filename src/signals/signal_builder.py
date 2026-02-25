import numpy as np

def compute_signals(predicted, actual_window):
    actual = actual_window[-1]
    error = abs(predicted - actual)

    z_score = (error - np.mean(actual_window)) / (np.std(actual_window) + 1e-6)

    slope = actual_window[-1] - actual_window[0]
    volatility = np.std(actual_window)

    return {
        "prediction_error": float(error),
        "z_score": float(z_score),
        "slope": float(slope),
        "volatility": float(volatility)
    }
