# Urban Pulse  
Real-Time Student Crowd Management via Network Activity Analysis

Urban Pulse is an end-to-end AI system designed to monitor, analyze, and predict student crowd density using network activity signals. The project combines temporal modeling, decision logic, and reasoning layers to produce interpretable and reliable real-time insights.

---

## 1. Project Overview

Urban Pulse replaces traditional crowd monitoring methods (e.g., CCTV/manual reporting) with a data-driven approach based on:

- Network activity signal patterns  
- Time-series forecasting (GRU-based model)  
- Decision index evaluation  
- Reasoning layer for explainability  
- Real-time dashboard integration via Firebase  

The system is structured as a modular AI pipeline rather than a standalone prediction model.

---

## 2. System Architecture


Dataset / Cloud Source
↓
Data Ingestion
↓
Preprocessing & Feature Engineering
↓
Temporal Model (GRU)
↓
Decision Engine (Index Matrix Logic)
↓
Reasoning Layer
↓
Firebase Sync
↓
React Dashboard


---

## 3. Project Structure


URBAN_PULSE/
│
├── config/ # Configuration files
├── dataset/ # Raw and processed datasets
├── notebook/ # Experimental notebooks
├── scripts/
│ └── train.py # Model training script
│
├── src/
│ ├── data/ # Data loading and preprocessing
│ ├── signals/ # Network signal feature extraction
│ ├── models/ # GRU temporal model
│ ├── decision/ # Decision index matrix logic
│ ├── reasoning/ # Explanation / reasoning module
│ ├── firebase_client.py # Firebase integration
│
├── ui/ # React frontend
│
├── pipeline.py # Full inference pipeline
├── main.py # Entry point
├── requirements.txt
├── README.md


---

## 4. Core Components

### 4.1 Temporal Model
- GRU-based sequence model
- Learns short-term crowd density patterns
- Designed for time-series signal forecasting

### 4.2 Decision Engine
- Index-based evaluation logic
- Converts model outputs into interpretable risk levels
- Structured to allow threshold tuning and future reinforcement learning integration

### 4.3 Reasoning Layer
- Generates human-readable explanations for decisions
- Improves transparency and reliability
- Designed to reduce black-box behavior

### 4.4 Firebase Integration
- Stores inference results
- Enables real-time UI synchronization

---

## 5. Installation & Setup

### Clone the Repository


git clone <https://github.com/NithishKannanM/Urban-Pulse>
cd Urban-Pulse


### Install Backend Dependencies


pip install -r requirements.txt


### Add Firebase Credentials

Place your Firebase service account key inside:


src/firebase_key.json


Do not commit this file to version control.

### Run Backend Pipeline


python main.py


### Run Frontend


cd ui
npm install
npm start


---

## 6. Model Configuration

Specify the following details once finalized:

- Architecture: GRU
- Sequence window size:
- Prediction horizon:
- Loss function:
- Optimizer:
- Training dataset size:

---

## 7. Design Principles

- Modular architecture
- Separation of modeling and decision logic
- Explainability-focused system design
- Real-time synchronization capability
- Scalable for cloud deployment

---

## 8. Future Enhancements

- Data drift detection module
- Reinforcement learning-based adaptive thresholding
- Latency optimization
- Cloud-native deployment
- Multi-campus simulation support

---

## 9. Author

Nithish Kannan M  
B.Tech CSE  
AI Systems and Machine Learning