// ======================================================
// Firebase universal comments — fixed version
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
// STABLE AUTHOR DETECTION (fixed)
// ======================================================

function detectAuthor() {
    // always last folder before file
    const p = window.location.pathname.split("/").filter(x => x);
    // e.g. authors/kuznetsova/kuznetsovaua.html → we want "kuznetsova"
    const i = p.indexOf("authors");
    if (i !== -1 && p[i + 1]) return p[i + 1];
    return "global";
}

let authorId = detectAuthor();

// ======================================================
// Detect language
// ======================================================

function detectLanguage() {
    const langAttr = document.documentElement.lang;
    if (!langAttr) return "en";
    if (langAttr === "ua") return "uk";
    return langAttr.toLowerCase();
}

let lang = detectLanguage();

// ======================================================
// Admin login
// ======================================================

let isAdmin = false;

onAuthStateChanged(auth, user => {
    isAdmin = !!(user && user.email === "garmash110@gmail.com");
    loadComments();
});

window.adminLogin = async () => {
    try {
        await signInWithEmailAndPassword(auth, "garmash110@gmail.com", "410edfuf_G");
        alert("Ви увійшли як адмін");
        loadComments();
    } catch (err) {
        alert("Помилка входу: " + err.message);
        console.error(err);
    }
};

// ======================================================
// Comment submission
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("commentForm");

    if (form) {
        form.addEventListener("submit", async e => {
            e.preventDefault();

            const name = document.getElementById("name").value.trim();
            const text = document.getElementById("text").value.trim();
            if (!name || !text) return;

            await addDoc(collection(db, "comments"), {
                author: authorId,
                name,
                text,
                lang,
                timestamp: Date.now()
            });

            form.reset();
        });
    }

    loadComments();
    injectAuthorSidebar();
});

// ======================================================
// Load comments in real time (fixed)
// ======================================================

function loadComments() {
    const list = document.getElementById("commentsList");
    if (!list) return;

    const q = query(collection(db, "comments"), orderBy("timestamp", "desc"));

    onSnapshot(q, snap => {
        list.innerHTML = "";

        snap.forEach(docSnap => {
            const c = docSnap.data();

            // FIXED: now filtering works correctly
            if (c.author !== authorId) return;

            const wrap = document.createElement("div");
            wrap.className = "comment-item";

            wrap.innerHTML = `
                <p><strong>${c.name}</strong></p>
                <p>${c.text}</p>
                <small>${new Date(c.timestamp).toLocaleString()}</small>
                <button class="delete-comment" data-id="${docSnap.id}" 
                    ${isAdmin ? "" : 'style="display:none;"'}>
                    Delete
                </button>
                <hr>
            `;

            list.append(wrap);
        });

        // fix dead buttons
        list.querySelectorAll(".delete-comment").forEach(btn => {
            btn.onclick = async () => {
                try {
                    await deleteDoc(doc(db, "comments", btn.dataset.id));
                } catch (err) {
                    alert("Помилка: " + err.message);
                }
            };
        });
    });
}

// ======================================================
// Sidebar
// ======================================================

const AUTHORS = {
    kuznetsova: {
        en: { name: "Yevhenia Kuznietsova", url: "/UkrBooks/authors/kuznetsova/kuznetsovaen.html" },
        fr: { name: "Ievheniia Kuznietsova", url: "/UkrBooks/authors/kuznetsova/kuznetsovafr.html" },
        uk: { name: "Євгенія Кузнєцова", url: "/UkrBooks/authors/kuznetsova/kuznetsovaua.html" }
    }
};

function injectAuthorSidebar() {
    const list = document.getElementById("authors-list");
    if (!list) return;

    list.innerHTML = "";

    for (const key in AUTHORS) {
        const data = AUTHORS[key][lang] || AUTHORS[key].en;
        const li = document.createElement("li");
        li.innerHTML = `<a href="${data.url}">${data.name}</a>`;
        list.append(li);
    }
}
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

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
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
        if (file.includes("ua") || file.includes("uk"))      lang = "uk";
        else if (file.includes("fr"))                        lang = "fr";
        else if (file.includes("en"))                        lang = "en";
        else                                                 lang = "en";
    }

    if (lang === "ua") lang = "uk";
    return lang;
}

let lang = detectLanguage();

// ======================================================
// Admin login
// ======================================================

let isAdmin = false;

// следим за состоянием авторизации
onAuthStateChanged(auth, (user) => {
    isAdmin = !!(user && user.email === "garmash110@gmail.com");
    console.log("Auth state changed, isAdmin =", isAdmin);
    // после смены статуса перерисуем комментарии с актуальными правами
    loadComments();
});

// глобальная функция для кнопки "Войти как адмін"
window.adminLogin = async function () {
    try {
        const cred = await signInWithEmailAndPassword(
            auth,
            "garmash110@gmail.com",
            "410edfuf_G"
        );
        console.log("Admin login success:", cred.user?.email);
        alert("Ви увійшли як адмін.");
        loadComments();
    } catch (err) {
        console.error("Admin login error:", err);
        alert("Помилка входу як адмін: " + (err.message || err));
    }
};

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

            try {
                await addDoc(collection(db, "comments"), {
                    author: authorId,
                    name,
                    text,
                    lang: lang,
                    timestamp: Date.now()
                });
                form.reset();
            } catch (err) {
                console.error("Error adding comment:", err);
                alert("Помилка при додаванні коментаря: " + (err.message || err));
            }
        });
    }

    // если кнопка есть с id="adminLoginBtn" — тоже привяжем
    const adminBtn = document.getElementById("adminLoginBtn");
    if (adminBtn) {
        adminBtn.addEventListener("click", () => window.adminLogin());
    }

    injectAuthorSidebar();
    loadComments();
});

// ======================================================
// Load comments in real time
// ======================================================

let unsubscribeComments = null;

function loadComments() {
    const list = document.getElementById("commentsList");
    if (!list) return;

    const q = query(collection(db, "comments"), orderBy("timestamp", "desc"));

    if (unsubscribeComments) {
        unsubscribeComments();
    }

    unsubscribeComments = onSnapshot(
        q,
        (snapshot) => {
            list.innerHTML = "";

            snapshot.forEach((docSnap) => {
                const c = docSnap.data();

                if (c.author !== authorId) return;

                const item = document.createElement("div");
                item.className = "comment-item";

                const dateStr = c.timestamp
                    ? new Date(c.timestamp).toLocaleString()
                    : "";

                // Кнопка есть всегда, но скрыта, если не админ
                const deleteButtonStyle = isAdmin ? "" : 'style="display:none;"';

                item.innerHTML = `
                    <p><strong>${c.name}</strong></p>
                    <p>${c.text}</p>
                    <small>${dateStr}</small>
                    <button type="button"
                            class="delete-comment"
                            data-id="${docSnap.id}"
                            ${deleteButtonStyle}>
                        Delete
                    </button>
                    <hr>
                `;

                list.appendChild(item);
            });

            // Делаем кнопки живыми
            const buttons = list.querySelectorAll(".delete-comment");
            buttons.forEach((btn) => {
                btn.onclick = async () => {
                    if (!isAdmin) {
                        alert("Видаляти коментарі може тільки адміністратор.");
                        return;
                    }
                    const id = btn.dataset.id;
                    try {
                        console.log("Trying to delete comment with id:", id);
                        await deleteDoc(doc(db, "comments", id));
                        console.log("Comment deleted");
                    } catch (err) {
                        console.error("Error deleting comment:", err);
                        alert("Помилка при видаленні коментаря: " + (err.message || err));
                    }
                };
            });

            console.log(
                "Comments rendered. Buttons:",
                buttons.length,
                "isAdmin:",
                isAdmin
            );
        },
        (err) => {
            console.error("onSnapshot error:", err);
        }
    );
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

    Object.keys(AUTHORS).forEach((key) => {
        const record = AUTHORS[key];
        const entry  = record[lang] || record["en"];

        const li = document.createElement("li");
        li.innerHTML = `<a href="${entry.url}">${entry.name}</a>`;
        list.appendChild(li);
    });
}
