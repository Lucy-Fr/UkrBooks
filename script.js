// ======================================================
// CLEAN UNIVERSAL FIREBASE COMMENTS + SIDEBAR (AUTHORS + ESSAYS)
// FIXES:
// 1) removed hardcoded admin password (critical leak)
// 2) admin check uses custom claim (recommended) or allowlist fallback
// 3) comments query filters by page in Firestore (less data, faster)
// 4) basic XSS-safe rendering for user content
// ======================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  query, where, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ------------------------------------------------------
// Firebase configuration (public identifiers; keep API key restricted in GCP)
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
// ADMIN AUTH (NO PASSWORD IN FRONTEND)
// Option A (recommended): set a custom claim "admin": true on your account
// Option B (fallback): allowlist by email (still requires secure rules)
// ======================================================

let isAdmin = false;
const ADMIN_EMAILS = new Set(["garmash110@gmail.com"]);

function setAdminUI() {
  const loginBtn  = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const statusEl  = document.getElementById("adminStatus");

  if (!loginBtn || !logoutBtn || !statusEl) return;

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

onAuthStateChanged(auth, async user => {
  isAdmin = false;

  if (user) {
    try {
      // If you configured custom claims:
      const token = await user.getIdTokenResult();
      if (token?.claims?.admin === true) {
        isAdmin = true;
      } else if (ADMIN_EMAILS.has(user.email || "")) {
        // Fallback allowlist (still protect with Firestore rules)
        isAdmin = true;
      }
    } catch (_) {
      isAdmin = ADMIN_EMAILS.has(user.email || "");
    }
  }

  setAdminUI();
  loadComments();
});

// ------------------------------------------------------
// Login/Logout handlers (Google popup; no secrets in JS)
// ------------------------------------------------------

window.adminLogin = async function () {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
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
// COMMENT SUBMISSION + SIDEBAR INJECTION
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
  const form   = document.getElementById("commentForm");
  const login  = document.getElementById("loginBtn");
  const logout = document.getElementById("logoutBtn");

  if (login)  login.onclick  = () => window.adminLogin();
  if (logout) logout.onclick = () => window.adminLogout();

  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();

      const nameEl = document.getElementById("name");
      const textEl = document.getElementById("text");

      const name = nameEl ? nameEl.value.trim() : "";
      const text = textEl ? textEl.value.trim() : "";

      if (!name || !text) return;

      await addDoc(collection(db, "comments"), {
        page: pageId,
        name,
        text,
        lang,
        createdAt: serverTimestamp(), // preferred
        timestamp: Date.now() // keep for backward compatibility if you already used it
      });

      form.reset();
    });
  }

  injectSidebars();
  loadComments();
});

// ======================================================
// LOAD COMMENTS (REALTIME) — server-side filter by page
// ======================================================

let unsubscribe = null;

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadComments() {
  const list = document.getElementById("commentsList");
  if (!list) return;

  // Query only the current page's comments
  const q = query(
    collection(db, "comments"),
    where("page", "==", pageId),
    orderBy("timestamp", "desc")
  );

  if (unsubscribe) unsubscribe();

  unsubscribe = onSnapshot(q, snapshot => {
    list.innerHTML = "";

    snapshot.forEach(docSnap => {
      const c = docSnap.data();

      const nameSafe = escapeHtml(c.name ?? "");
      const textSafe = escapeHtml(c.text ?? "");
      const ts = c.timestamp ?? (c.createdAt?.toMillis?.() ?? Date.now());

      const item = document.createElement("div");
      item.className = "comment-item";

      item.innerHTML = `
        <p><strong>${nameSafe}</strong></p>
        <p>${textSafe}</p>
        <small>${new Date(ts).toLocaleString()}</small>
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
// SIDEBAR (AUTHORS + ESSAYS) — single source of truth
// ======================================================

const SIDEBAR_LABELS = {
  en: { authors: "Authors", essays: "Essays" },
  fr: { authors: "Auteurs", essays: "Essais" },
  uk: { authors: "Автори",  essays: "Есеї" }
};

const AUTHORS = {
  zhadan: {
    en: { name: "Serhiy Zhadan", url: "/UkrBooks/authors/zhadan/zhadanen.html" },
    fr: { name: "Serhiy Jadan",  url: "/UkrBooks/authors/zhadan/zhadanfr.html" },
    uk: { name: "Сергій Жадан",  url: "/UkrBooks/authors/zhadan/zhadanua.html" }
  },

  kuznetsova: {
    en: { name: "Yevheniia Kuznietsova", url: "/UkrBooks/authors/kuznetsova/kuznetsovaen.html" },
    fr: { name: "Ievheniia Kuznietsova", url: "/UkrBooks/authors/kuznetsova/kuznetsovafr.html" },
    uk: { name: "Євгенія Кузнєцова",     url: "/UkrBooks/authors/kuznetsova/kuznetsovaua.html" }
  }
};

const ESSAYS = {
  beyond_empire: {
    en: { title: "Beyond Empire", url: "/UkrBooks/essays/beyond-empire.html" },
    fr: { title: "Au-delà de l’Empire", url: "/UkrBooks/essays/beyond-empire-fr.html" },
    uk: { title: "Поза імперією", url: "/UkrBooks/essays/beyond-empire.html-ua" }
  },

  we_can_do_it_again: {
    en: { title: "“We Can Do It Again”", url: "/UkrBooks/essays/we-can-do-it-again.html" },
    fr: { title: "« On peut recommencer »", url: "/UkrBooks/essays/on-peut-recommencer-fr.html" },
    uk: { title: "«Можемо повторити»", url: "/UkrBooks/essays/mozhemo-povtoryty.html-ua" }
  }
};

function injectSidebarTitles() {
  const labels = SIDEBAR_LABELS[lang] || SIDEBAR_LABELS.en;

  const authorsTitle = document.getElementById("sidebar-authors-title");
  const essaysTitle  = document.getElementById("sidebar-essays-title");

  if (authorsTitle) authorsTitle.textContent = labels.authors;
  if (essaysTitle)  essaysTitle.textContent  = labels.essays;
}

function injectAuthors() {
  const list = document.getElementById("authors-list");
  if (!list) return;

  list.innerHTML = "";

  for (const key in AUTHORS) {
    const entry = AUTHORS[key][lang] || AUTHORS[key].en;
    const li = document.createElement("li");
    li.innerHTML = `<a href="${entry.url}">${escapeHtml(entry.name)}</a>`;
    list.appendChild(li);
  }
}

function injectEssays() {
  const list = document.getElementById("essays-list");
  if (!list) return;

  list.innerHTML = "";

  for (const key in ESSAYS) {
    const entry = ESSAYS[key][lang] || ESSAYS[key].en;
    const li = document.createElement("li");
    li.innerHTML = `<a href="${entry.url}">${escapeHtml(entry.title)}</a>`;
    list.appendChild(li);
  }
}

function injectSidebars() {
  injectSidebarTitles();
  injectAuthors();
  injectEssays();
}
