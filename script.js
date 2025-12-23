// ======================================================
//  Firebase universal comments — works with your HTML
// ======================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getFirestore, collection, addDoc, deleteDoc, doc,
    query, orderBy, onSnapshot 
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
// Identify author from URL
// ================================
let urlParts = window.location.pathname.split("/");
let authorId = urlParts[3] || "unknown";

// ================================
// Admin auto-login
// ================================
let isAdmin = false;

onAuthStateChanged(auth, (user) => {
    isAdmin = user && user.email === "garmash110@gmail.com";
    loadComments();
});

signInWithEmailAndPassword(auth, "garmash110@gmail.com", "410edfuf_G")
    .catch(()=>{});

// ================================
// Submit comment
// ================================
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("commentForm");
    const list = document.getElementById("commentsList");

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
                timestamp: Date.now()
            });

            form.reset();
        });
    }

    injectAuthorSidebar();
});

// ================================
// Load comments in real time
// ================================
function loadComments() {
    const list = document.getElementById("commentsList");
    if (!list) return;

    const q = query(
        collection(db, "comments"),
        orderBy("timestamp", "desc")
    );

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
                ${isAdmin ? 
                   `<button class="delete-comment" data-id="${docSnap.id}">Delete</button>`
                : ""}
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

// ================================
// SIDEBAR — one name depending on language
// ================================

// имя → URL
const authorSidebarNames = {
    "en": { 
        name: "Yevhenia Kuznietsova",
        url: "/UkrBooks/authors/kuznetsova/kuznetsovaen.html"
    },
    "fr": {
        name: "Ievheniia Kuznetsova",
        url: "/UkrBooks/authors/kuznetsova/kuznetsovafr.html"
    },
    "ua": {
        name: "Євгенія Кузнєцова",
        url: "/UkrBooks/authors/kuznetsova/kuznetsovaua.html"
    },
    "uk": {   // ← добавлено ДЛЯ УКРАИНСКОЙ СТРАНИЦЫ
        name: "Євгенія Кузнєцова",
        url: "/UkrBooks/authors/kuznetsova/kuznetsovaua.html"
    }
};

function injectAuthorSidebar() {
    const list = document.getElementById("authors-list");
    if (!list) return;

    let lang = document.documentElement.lang.toLowerCase();

    if (authorSidebarNames[lang]) {
        const li = document.createElement("li");
        li.innerHTML = `<a href="${authorSidebarNames[lang].url}">
                            ${authorSidebarNames[lang].name}
                        </a>`;
        list.appendChild(li);
    }
}
