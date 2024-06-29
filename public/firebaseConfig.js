// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDconE5KQf35rIh7Ku4TgfQHQWLE9mm0qw",
  authDomain: "gestorclientescomedor.firebaseapp.com",
  projectId: "gestorclientescomedor",
  storageBucket: "gestorclientescomedor.appspot.com",
  messagingSenderId: "9671580432",
  appId: "1:9671580432:web:4f0ea6a1f42861a4432395",
  measurementId: "G-SJDM9SP4Y0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };