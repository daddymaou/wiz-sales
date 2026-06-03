import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDkeSCMXiQQWZ-Ofr0wdXezDRGn-qlaW1M",
  authDomain: "wiz-sales.firebaseapp.com",
  projectId: "wiz-sales",
  storageBucket: "wiz-sales.firebasestorage.app",
  messagingSenderId: "1001968522300",
  appId: "1:1001968522300:web:6772fff78e67e99d0d5f39",
  measurementId: "G-M7BN9TWQGC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Export all services
export { db, storage, auth };