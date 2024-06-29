// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCXFFthOFOsD8MhzTSd7bq5v-t881UTeOE",
  authDomain: "clientescomedorterminal.firebaseapp.com",
  projectId: "clientescomedorterminal",
  storageBucket: "clientescomedorterminal.appspot.com",
  messagingSenderId: "1057209603633",
  appId: "1:1057209603633:web:4aa70bd3d4e536eb406710",
  measurementId: "G-CYQNYH5CYW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };