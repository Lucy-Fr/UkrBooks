// ======================================================
//  Firebase universal comments — works on ALL pages
// ======================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getFirestore, collection, addDoc, deleteDoc, doc,
    query, orderBy, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    getAuth, onAuthStateChanged, signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ------------------------------------------------------
//  Firebase configuration
// ------------------------------------------------------

const firebaseConfig = {
  apiKey: "AIzaSyBi3kVG2G0RTXKV2EIhs4fQXEkaJ7X6HXU",
  authDomain: "ucontemporarylit.firebaseapp.com",
  projectId: "ucontemporarylit",
  storageBucket: "ucontemporarylit.appspot.com",
  messagingSenderId: "828332585690",
  appId: "1:828332585690:web:dbdb5a5edf7b5329d4ebe3",
  measurementId: "G-7493F35CVD"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ======================================================
// Identify author from URL (for comments ONLY)
// ======================================================

let parts = window.location.pathname.split("/").filter(x => x);

// Expected:
// /UkrBooks/authors/kuznetsova/kuznetsovaen.html
// ["UkrBooks","authors","kuznetsova","kuznetsovaen.html"]

let authorId = (parts[1] === "authors" && parts[2]) ? parts[2] : "global";

// ======================================================
// Detect language
// ======================================================

function detectLanguage() {
    let lang = (document.documentElement.lang || "").toLowerCase();

    if (!lang) {
        const file = window.location.pathname.toLowerCase();
        if (file.includes("ua") || file.includes("uk")) lang = "uk";
        else if (file.includes("fr")) lang = "fr";
        else if (file.includes("en")) lang = "en";
        else lang = "en";
    }

    if (lang === "ua") lang = "uk";
    return lang;
}

let lang = detectLanguage();

// ======================================================
// Admin auto-login
// ======================================================

let isAdmin = false;

onAuthStateChanged(auth, (user) => {
    isAdmin = (user && user.email === "garmash110@gmail.com");
    loadComments();
});

// <-- ВАЖНО: автологин запускаем ПОСЛЕ загрузки страницы
window.addEventListener("load", () => {
    signInWithEmailAndPassword(auth, "garmash110@gmail.com", "410edfuf_G")
        .catch(() => {});
});


// ======================================================
// Comment submission
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("commentForm");

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const name = document.getElementById("name").value.trim();
            const text = document.getElementById("text").value.trim();

            if (!name || !text) return;

            await addDoc(collection(db, "comments"), {
                author: authorId,
                name,
                text,
                lang: lang,
                timestamp: Date.now()
            });

            form.reset();
        });
    }

    injectAuthorSidebar();
});

// ======================================================
// Load comments in real time
// ======================================================

function loadComments() {
    const list = document.getElementById("commentsList");
    if (!list) return;

    const q = query(collection(db, "comments"), orderBy("timestamp", "desc"));

    onSnapshot(q, (snapshot) => {
        list.innerHTML = "";

        snapshot.forEach((docSnap) => {
            const c = docSnap.data();

            if (c.author !== authorId) return;

            const item = document.createElement("div");
            item.className = "comment-item";

            item.innerHTML = `
                <p><strong>${c.name}</strong></p>
                <p>${c.text}</p>
                <small>${new Date(c.timestamp).toLocaleString()}</small>
                ${isAdmin ? `<button class="delete-comment" data-id="${docSnap.id}">Delete</button>` : ""}
                <hr>
            `;

            list.appendChild(item);
        });

        if (isAdmin) {
            document.querySelectorAll(".delete-comment").forEach(btn => {
                btn.onclick = async () => {
                    await deleteDoc(doc(db, "comments", btn.dataset.id));
                };
            });
        }
    });
}

// ======================================================
//  UNIVERSAL SIDEBAR WITH FULL LIST OF AUTHORS
// ======================================================

const AUTHORS = {
    kuznetsova: {
        en: { name: "Yevhenia Kuznietsova", url: "/UkrBooks/authors/kuznetsova/kuznetsovaen.html" },
        fr: { name: "Ievheniia Kuznietsova", url: "/UkrBooks/authors/kuznetsova/kuznetsovafr.html" },
        uk: { name: "Євгенія Кузнєцова", url: "/UkrBooks/authors/kuznetsova/kuznetsovaua.html" }
    }
    // -------- add new authors here ----------
    // zhadan: {
    //     en: { name: "Serhiy Zhadan", url: "/UkrBooks/authors/zhadan/zhadanen.html" },
    //     fr: { name: "Sergueï Jadan", url: "/UkrBooks/authors/zhadan/zhadanfr.html" },
    //     uk: { name: "Сергій Жадан", url: "/UkrBooks/authors/zhadan/zhadanua.html" }
    // }
};

// ======================================================
// Build sidebar ON ALL PAGES
// ======================================================

function injectAuthorSidebar() {
    const list = document.getElementById("authors-list");
    if (!list) return;

    list.innerHTML = ""; // reset sidebar

    Object.keys(AUTHORS).forEach(key => {
        const record = AUTHORS[key];

        // pick correct name for current language
        const entry = record[lang] || record["en"];

        const li = document.createElement("li");
        li.innerHTML = `<a href="${entry.url}">${entry.name}</a>`;
        list.appendChild(li);
    });
}
