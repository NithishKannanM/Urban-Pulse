import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import os

def initialize_firebase():
    if not firebase_admin._apps:
        cred = credentials.Certificate("src/firebase_key.json")
        firebase_admin.initialize_app(cred)

    return firestore.client()


def push_raw_log(db, data):
    db.collection("urbanpulse_raw_logs").add(data)


def push_decision(db, data):
    db.collection("urbanpulse_decisions").add(data)