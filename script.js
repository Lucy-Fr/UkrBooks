// ======================================================
// CLEAN UNIVERSAL FIREBASE COMMENTS + SIDEBAR
// ======================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore, collection, addDoc, deleteDoc, doc,
    query, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ------------------------------------------------------
// Firebase configuration
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

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// ======================================================
// PAGE ID (each HTML page has its own comments)
// ======================================================

const pageId = window.location.pathname;

// ======================================================
// LANGUAGE DETECTION
// ======================================================

function detectLanguage() {
    let lang = document.documentElement.lang?.toLowerCase() || "";

    if (!lang) {
        const path = window.location.pathname.toLowerCase();
        if (path.includes("ua") || path.includes("uk")) return "uk";
        if (path.includes("fr")) return "fr";
        return "en";
    }

    if (lang === "ua") return "uk";
    return lang;
}

const lang = detectLanguage();

// ======================================================
// ADMIN AUTH
// ======================================================

let isAdmin = false;

onAuthStateChanged(auth, user => {
    isAdmin = !!(user && user.email === "garmash110@gmail.com");

    const loginBtn  = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const statusEl  = document.getElementById("adminStatus");

    if (loginBtn && logoutBtn && statusEl) {
        if (isAdmin) {
            loginBtn.style.display  = "none";
            logoutBtn.style.display = "inline-block";
            statusEl.textContent    = "Admin mode";
        } else {
            loginBtn.style.display  = "inline-block";
            logoutBtn.style.display = "none";
            statusEl.textContent    = "";
        }
    }

    loadComments();
});

window.adminLogin = async function () {
    try {
        await signInWithEmailAndPassword(auth, "garmash110@gmail.com", "410edfuf_G");
    } catch (err) {
        alert("Login error: " + err.message);
    }
};

window.adminLogout = async function () {
    try {
        await signOut(auth);
    } catch (err) {
        alert("Logout error: " + err.message);
    }
};

// ======================================================
// COMMENT SUBMISSION
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
    const form  = document.getElementById("commentForm");
    const login = document.getElementById("loginBtn");
    const logout= document.getElementById("logoutBtn");

    if (login)  login.onclick  = () => window.adminLogin();
    if (logout) logout.onclick = () => window.adminLogout();

    if (form) {
        form.addEventListener("submit", async e => {
            e.preventDefault();

            const name = document.getElementById("name").value.trim();
            const text = document.getElementById("text").value.trim();

            if (!name || !text) return;

            await addDoc(collection(db, "comments"), {
                page: pageId,
                name,
                text,
                lang,
                timestamp: Date.now()
            });

            form.reset();
        });
    }

    injectAuthorSidebar();
    loadComments();
});

// ======================================================
// LOAD COMMENTS (REALTIME)
// ======================================================

let unsubscribe = null;

function loadComments() {
    const list = document.getElementById("commentsList");
    if (!list) return;

    const q = query(collection(db, "comments"), orderBy("timestamp", "desc"));

    if (unsubscribe) unsubscribe();

    unsubscribe = onSnapshot(q, snapshot => {
        list.innerHTML = "";

        snapshot.forEach(docSnap => {
            const c = docSnap.data();

            if (c.page !== pageId) return;

            const item = document.createElement("div");
            item.className = "comment-item";

            item.innerHTML = `
                <p><strong>${c.name}</strong></p>
                <p>${c.text}</p>
                <small>${new Date(c.timestamp).toLocaleString()}</small>

                <button class="delete-comment"
                        data-id="${docSnap.id}"
                        style="${isAdmin ? "" : "display:none;"}">
                    Delete
                </button>
                <hr>
            `;

            list.appendChild(item);
        });

        list.querySelectorAll(".delete-comment").forEach(btn => {
            btn.onclick = async () => {
                if (!isAdmin) return alert("Only admin can delete comments.");
                await deleteDoc(doc(db, "comments", btn.dataset.id));
            };
        });
    });
}

// ======================================================
// SIDEBAR AUTHORS
// ======================================================

const AUTHORS = {
    kuznetsova: {
        en: { name: "Yevhenia Kuznietsova", url: "/UkrBooks/authors/kuznetsova/kuznetsovaen.html" },
        fr: { name: "Ievheniia Kuznietsova", url: "/UkrBooks/authors/kuznetsova/kuznetsovafr.html" },
        uk: { name: "Євгенія Кузнєцова",     url: "/UkrBooks/authors/kuznetsova/kuznetsovaua.html" }
    }
};

function injectAuthorSidebar() {
    const list = document.getElementById("authors-list");
    if (!list) return;

    list.innerHTML = "";

    for (const key in AUTHORS) {
        const entry = AUTHORS[key][lang] || AUTHORS[key].en;
        const li = document.createElement("li");
        li.innerHTML = `<a href="${entry.url}">${entry.name}</a>`;
        list.appendChild(li);
    }
}
