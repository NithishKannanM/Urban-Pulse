import numpy as np

def build_windows(data, window_size=30):
    X = []
    for i in range(window_size, len(data)):
        X.append(data[i - window_size:i])
    return np.array(X)
