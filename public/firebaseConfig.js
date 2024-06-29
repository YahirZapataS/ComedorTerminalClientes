// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCQXZkVirBnRozk6wwi2Ht2-vrWYc1qJgY",
  authDomain: "clientescomedorterminal-c0979.firebaseapp.com",
  projectId: "clientescomedorterminal-c0979",
  storageBucket: "clientescomedorterminal-c0979.appspot.com",
  messagingSenderId: "105176022152",
  appId: "1:105176022152:web:f16de4387f1fc8e171f33d",
  measurementId: "G-G24R6DY3FJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };