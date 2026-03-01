import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBgIUb_9Jw-L2HjveFDqUTgyHiAV-yHlb4",
  authDomain: "urbanpulse-6727d.firebaseapp.com",
  databaseURL: "https://urbanpulse-6727d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "urbanpulse-6727d",
  storageBucket: "urbanpulse-6727d.firebasestorage.app",
  messagingSenderId: "513080328612",
  appId: "1:513080328612:web:544f3a67d11713f9db0131",
  measurementId: "G-RMR7450B9B"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);