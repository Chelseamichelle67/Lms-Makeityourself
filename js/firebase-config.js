
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC2vX-1uDonpH0MIo4zj1CXgaHcsTRtHvw",
  authDomain: "make-it-yourself-e87e9.firebaseapp.com",
  projectId: "make-it-yourself-e87e9",
  storageBucket: "make-it-yourself-e87e9.firebasestorage.app",
  messagingSenderId: "399603789390",
  appId: "1:399603789390:web:117ebf68cb79495aa85d1f",
  measurementId: "G-0YX91MFY9J"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
