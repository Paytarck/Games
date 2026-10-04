// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCgNliG5se3wN23jzMwBEHI1PGHEiyNplg",
  authDomain: "tank-battle-game-eb270.firebaseapp.com",
  databaseURL: "https://tank-battle-game-eb270-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tank-battle-game-eb270",
  storageBucket: "tank-battle-game-eb270.firebasestorage.app",
  messagingSenderId: "1049093918798",
  appId: "1:1049093918798:web:45003bbf14c7e8ba8e331f",
  measurementId: "G-HJHGK9GEXH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);