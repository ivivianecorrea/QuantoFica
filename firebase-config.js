import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, push, update, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDsa9anZiq269RFqyJPXQTIrKyjMK1wi6U",
  authDomain: "quantofica-6aef8.firebaseapp.com",
  databaseURL: "https://quantofica-6aef8-default-rtdb.firebaseio.com",
  projectId: "quantofica-6aef8",
  storageBucket: "quantofica-6aef8.firebasestorage.app",
  messagingSenderId: "348214501619",
  appId: "1:348214501619:web:32876a781640cf9e67d786"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, set, push, update, onValue };