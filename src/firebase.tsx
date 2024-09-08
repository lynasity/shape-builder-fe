// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAgjIifXBBB91_gM6bVh2kCfjbtJfPOocs",
  authDomain: "partfill.firebaseapp.com",
  projectId: "partfill",
  storageBucket: "partfill.appspot.com",
  messagingSenderId: "878883910722",
  appId: "1:878883910722:web:3f7104e5b3b4659f27e9db",
  measurementId: "G-542QPRTKHH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);// Import the functions you need from the SDKs you need
