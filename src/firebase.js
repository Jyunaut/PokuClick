// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCRtIE-jx4XRCWc5yf-8sBGMnkf4_0KkO0",
  authDomain: "jyunaut.firebaseapp.com",
  projectId: "jyunaut",
  storageBucket: "jyunaut.firebasestorage.app",
  messagingSenderId: "511001489934",
  appId: "1:511001489934:web:e87eaf8029df6f0e41025f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };