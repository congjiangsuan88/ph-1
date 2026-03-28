import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    getDatabase, ref, update, equalTo, push, onChildAdded, onValue, runTransaction, query, orderByChild, limitToLast, get, endAt, remove, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
const firebaseConfig = {
    apiKey: "AIzaSyBCB9Vyw7Cw-Tx3CphIlTroBRGrqKUcVb8",
    authDomain: "ph-1-com.firebaseapp.com",
    projectId: "ph-1-com",
    storageBucket: "ph-1-com.firebasestorage.app",
    messagingSenderId: "509583748605",
    appId: "1:509583748605:web:9b19972990ea06db627d94",
    measurementId: "G-LWV16K64X7",
    databaseURL: "https://ph-1-com-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// 初始化 App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// --- 关键：静默匿名登录逻辑 ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        signInAnonymously(auth).catch((err) => console.error("匿名登录失败", err));
    }
});

export { auth, db, ref, update, equalTo, push, onChildAdded, onValue, runTransaction, query, orderByChild, limitToLast, get, endAt, remove, serverTimestamp };