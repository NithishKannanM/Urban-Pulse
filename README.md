# UrbanPulse
## Decision-Centric Energy Intelligence Console

UrbanPulse is a deterministic infrastructure decision system that converts real-time electrical telemetry into economically justified operational actions for campuses, data centers, and industrial facilities.

It combines time-series forecasting, risk modeling, and cost-aware policy evaluation to recommend when to:

- **MONITOR**
- **PREPARE**
- **INTERVENE**

This is not a chatbot-based AI dashboard.  
UrbanPulse is a mathematically grounded decision-support system designed for infrastructure operators.

---

## 🚩 Problem Statement

Large infrastructure environments (campuses, data centers, industries) consume significant electricity.  
Fluctuations, overload patterns, and inefficiencies can lead to:

- Energy wastage  
- Increased carbon emissions  
- Equipment stress  
- Avoidable operational costs  

Most monitoring dashboards only show metrics.  
UrbanPulse converts signals into economically justified operational decisions.

---

##  System Overview

UrbanPulse operates in four stages:

### 1️⃣ Telemetry Ingestion
Voltage, current, power, reactive power, power factor, temperature, fluctuation.

### 2️⃣ Temporal Forecasting Model
A PyTorch-based model predicts:
- Risk score  
- Regime level  

### 3️⃣ Mathematical Cost Modeling
Failure loss is computed using:

- Energy imbalance (kWh)
- Electricity price
- Carbon intensity
- Carbon pricing

### 4️⃣ Deterministic Policy Engine
Compares:

**Expected Wait Loss**  
vs  
**Intervention Cost**

Then outputs:

- MONITOR  
- PREPARE  
- INTERVENE  

---

##  Architecture

```
Telemetry (CSV / Stream)
↓
Feature Window Builder
↓
Temporal Model (PyTorch)
↓
Risk & Regime Output
↓
Cost Model
↓
Policy Engine
↓
Firebase (Real-time Logs)
↓
React Infrastructure Console
```

---

## UI Preview
<img width="1911" height="962" alt="Screenshot From 2026-03-01 21-56-31" src="https://github.com/user-attachments/assets/575a3963-8f82-4981-9658-8a24d6a38435" />



---

## ✨ Key Features

- Deterministic action policy (no black-box LLM decisions)
- Economic loss modeling
- Carbon impact estimation
- Real-time Firebase logging
- Infrastructure-grade UI console
- Configurable deployment context:
  - Campus
  - Data Center
  - Industrial Facility

---

## 💰 Economic Model

Energy Imbalance:

```
Energy (kWh) = |ΔP| × Time Window
```

Energy Cost:

```
Energy Cost = Energy × Electricity Price
```

Carbon Emission:

```
CO₂ (kg) = Energy × Carbon Intensity
```

Carbon Cost:

```
Carbon Cost = CO₂ × Carbon Price
```

Total Loss:

```
Total Loss = Energy Cost + Carbon Cost
```

Decision Logic:

```
If Expected Wait Loss > Intervention Cost → INTERVENE
If Moderate Risk → PREPARE
Else → MONITOR
```

---

## 📁 Repository Structure

```
UrbanPulse/
│
├── dataset/
├── notebook/
├── reference/
├── scripts/
├── src/
│ ├── models/
│ ├── decision/
│ ├── cost/
│ ├── mitigation/
│ └── firebase_client.py
│
├── ui/ # React Infrastructure Console
├── main.py
├── pipeline.py
├── requirement.txt
└── README.md
```

---

## 🛠 Tech Stack

### Backend
- Python
- PyTorch
- Firebase (Firestore)
- NumPy
- Pandas

### Frontend
- React
- Recharts
- Industrial dark theme UI

---

## ▶️ How to Run

### Backend
```
pip install -r requirement.txt
python main.py
```

Ensure the Firebase service key is placed at:
```
src/firebase_key.json
```

### Frontend
```
cd ui
npm install
npm start
```

## 🚀 Future Improvements

Real-time streaming ingestion

Cloud-native deployment

Threshold auto-calibration

Multi-site monitoring support

Live carbon savings counter

Historical performance analytics

## 🎯 Positioning

UrbanPulse is a configurable energy decision intelligence system designed to reduce:

Electricity waste

Carbon emissions

Operational instability

Preventable infrastructure costs

It bridges predictive modeling with economically rational infrastructure control.

## 👤 Author

Nithish Kannan M
B.Tech CSE
AI & ML Systems



