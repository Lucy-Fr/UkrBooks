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
    if (user && user.email === "garmash110@gmail.com") {
        isAdmin = true;
        loadComments();
    } else {
        isAdmin = false;
        loadComments();
    }
});

signInWithEmailAndPassword(auth, "garmash110@gmail.com", "410edfuf_G")
    .catch(()=>{});

// ================================
// Submit comment
// ================================
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("comment-form");
    const list = document.getElementById("comments-list");

    if (!form || !list) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = form.name.value.trim();
        const text = form.comment.value.trim();
        const captcha = form.captcha.value.trim();

        if (captcha !== "5") {
            alert("Wrong CAPTCHA.");
            return;
        }

        await addDoc(collection(db, "comments"), {
            author: authorId,
            name,
            text,
            timestamp: Date.now()
        });

        form.reset();
    });
});

// ================================
// Load comments in real time
// ================================
function loadComments() {
    const list = document.getElementById("comments-list");
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

        // Deletion for admin
        document.querySelectorAll(".delete-comment").forEach(btn => {
            btn.onclick = async () => {
                await deleteDoc(doc(db, "comments", btn.dataset.id));
            };
        });
    });
}
/* ==== SIDEBAR AUTHORS LIST ==== */

const authors = [
    { name: "Євгенія Кузнєцова", url: "/UkrBooks/authors/kuznetsova/kuznetsovaua.html" },
    { name: "Yevhenia Kuznietsova", url: "/UkrBooks/authors/kuznetsova/kuznetsovaen.html" },
    { name: "Ievheniia Kuznetsova", url: "/UkrBooks/authors/kuznetsova/kuznetsovafr.html" }
    // тут автоматично додамо інших — просто скажи
];

function injectAuthorSidebar() {
    const list = document.getElementById("authors-list");
    if (!list) return;

    authors.forEach(a => {
        const li = document.createElement("li");
        li.innerHTML = `<a href="${a.url}">${a.name}</a>`;
        list.appendChild(li);
    });
}

injectAuthorSidebar();
