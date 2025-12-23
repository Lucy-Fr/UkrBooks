// ================================
// Firebase INIT
// ================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getFirestore, collection, addDoc, deleteDoc, doc, query, orderBy, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    getAuth, onAuthStateChanged, signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBi3kVG2G0RTXKV2EIhs4fQXEkaJ7X6HXU",
  authDomain: "ucontemporarylit.firebaseapp.com",
  projectId: "ucontemporarylit",
  storageBucket: "ucontemporarylit.firebasestorage.app",
  messagingSenderId: "828332585690",
  appId: "1:828332585690:web:dbdb5a5edf7b5329d4ebe3",
  measurementId: "G-7493F35CVD"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ================================
// Авторизація адміністратора
// ================================
let isAdmin = false;

onAuthStateChanged(auth, (user) => {
    if (user && user.email === "garmash110@gmail.com") {
        isAdmin = true;
        loadComments();
    } else {
        isAdmin = false;
        loadComments();
    }
});

// Автоматичний логін адміністратора (щоб не вводити пароль на сайті)
signInWithEmailAndPassword(auth, "garmash110@gmail.com", "410edfuf_G").catch(()=>{});

// ================================
// Визначення автора зі сторінки
// URL виду: /authors/kuznetsova/kuznetsovaen.html
// Автор = другий сегмент
// ================================
let path = window.location.pathname.split("/");
let authorId = path[3] || "unknown";


// ================================
// Додавання коментаря
// ================================
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("comment-form");
    const list = document.getElementById("comments-list");

    if (!form || !list) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = form.name.value.trim();
        const comment = form.comment.value.trim();
        const captcha = form.captcha.value.trim();

        if (captcha !== "5") {
            alert("❌ Неправильна відповідь на CAPTCHA.");
            return;
        }

        await addDoc(collection(db, "comments"), {
            author: authorId,
            name: name,
            text: comment,
            timestamp: Date.now()
        });

        form.reset();
    });
});

// ================================
// Завантаження коментарів
// ================================
function loadComments() {
    const list = document.getElementBy
