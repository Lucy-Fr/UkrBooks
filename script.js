// ======================================================
// CLEAN UNIVERSAL FIREBASE COMMENTS + SIDEBAR (AUTHORS + ESSAYS)
// HARDENED VERSION (minimize bugs + reduce attack surface)
// - No secrets in frontend
// - Strict module-safe code
// - Page-scoped Firestore query
// - Robust escaping without replaceAll dependency
// - Avoid duplicate subscriptions
// - Safer event wiring, error handling
// - Stable author order (no for..in order ambiguity)
// ======================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  query, where, orderBy, onSnapshot, serverTimestamp, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ------------------------------------------------------
// Firebase configuration (public identifiers)
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
// PAGE ID (stable key per page)
// - strips query/hash
// - normalizes trailing slash
// ======================================================

function normalizePathname(p) {
  try {
    const u = new URL(p, window.location.origin);
    let path = u.pathname || "/";
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return path;
  } catch {
    let path = window.location.pathname || "/";
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return path;
  }
}
const pageId = normalizePathname(window.location.href);

// ======================================================
// LANGUAGE DETECTION
// - prefers <html lang="">
// - falls back to URL heuristics
// ======================================================

function detectLanguage() {
  const raw = (document.documentElement.lang || "").toLowerCase().trim();

  if (raw) {
    if (raw === "ua") return "uk";
    if (raw === "uk" || raw === "fr" || raw === "en") return raw;
  }

  const path = (window.location.pathname || "").toLowerCase();
  if (path.includes("/ua") || path.includes("ua.html") || path.includes("/uk") || path.includes("uk.html")) return "uk";
  if (path.includes("/fr") || path.includes("fr.html")) return "fr";
  return "en";
}
const lang = detectLanguage();

// ======================================================
// ADMIN AUTH (frontend check is NOT security; rules must enforce)
// - Prefer custom claim admin:true
// - Fallback allowlist by email
// ======================================================

let isAdmin = false;
const ADMIN_EMAILS = new Set(["garmash110@gmail.com"]);

function setAdminUI() {
  const loginBtn  = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const statusEl  = document.getElementById("adminStatus");

  // allow pages that don't have admin UI
  if (loginBtn)  loginBtn.style.display  = isAdmin ? "none" : "inline-block";
  if (logoutBtn) logoutBtn.style.display = isAdmin ? "inline-block" : "none";
  if (statusEl)  statusEl.textContent    = isAdmin ? "Admin mode" : "";
}

async function computeIsAdmin(user) {
  if (!user) return false;

  // safest: custom claim
  try {
    const token = await user.getIdTokenResult();
    if (token?.claims?.admin === true) return true;
  } catch {
    // ignore
  }

  // fallback: allowlist
  return ADMIN_EMAILS.has(user.email || "");
}

onAuthStateChanged(auth, async user => {
  isAdmin = await computeIsAdmin(user);
  setAdminUI();
  loadComments(); // refresh delete buttons / subscription
});

// ------------------------------------------------------
// Login/Logout handlers (Google popup)
// ------------------------------------------------------

window.adminLogin = async function () {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (err) {
    alert("Login error: " + (err?.message || err));
  }
};

window.adminLogout = async function () {
  try {
    await signOut(auth);
  } catch (err) {
    alert("Logout error: " + (err?.message || err));
  }
};

// ======================================================
// UTIL: escape HTML safely without replaceAll dependency
// ======================================================

function escapeHtml(value) {
  const s = String(value ?? "");
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ======================================================
// COMMENT SUBMISSION + SIDEBAR INJECTION
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
  const form   = document.getElementById("commentForm");
  const login  = document.getElementById("loginBtn");
  const logout = document.getElementById("logoutBtn");

  if (login)  login.addEventListener("click", () => window.adminLogin());
  if (logout) logout.addEventListener("click", () => window.adminLogout());

  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();

      const nameEl = document.getElementById("name");
      const textEl = document.getElementById("text");

      const name = (nameEl?.value || "").trim();
      const text = (textEl?.value || "").trim();

      // minimal validation to prevent empty spam
      if (!name || !text) return;

      // basic length caps to reduce abuse (UI-level only; rules should enforce)
      const safeName = name.slice(0, 80);
      const safeText = text.slice(0, 2000);

      try {
        await addDoc(collection(db, "comments"), {
          page: pageId,
          name: safeName,
          text: safeText,
          lang,
          createdAt: serverTimestamp(),
          timestamp: Date.now()
        });
        form.reset();
      } catch (err) {
        alert("Comment error: " + (err?.message || err));
      }
    });
  }

  injectSidebars();
  loadComments();
});

// ======================================================
// LOAD COMMENTS (REALTIME) — page-scoped query
// Notes:
// - This query may require a composite index: page + timestamp desc
// - limit() prevents huge lists
// ======================================================

let unsubscribe = null;

function loadComments() {
  const list = document.getElementById("commentsList");
  if (!list) return;

  const q = query(
    collection(db, "comments"),
    where("page", "==", pageId),
    orderBy("timestamp", "desc"),
    limit(200)
  );

  if (unsubscribe) unsubscribe();

  unsubscribe = onSnapshot(
    q,
    snapshot => {
      list.innerHTML = "";

      snapshot.forEach(docSnap => {
        const c = docSnap.data() || {};

        const nameSafe = escapeHtml(c.name);
        const textSafe = escapeHtml(c.text);

        const ts =
          typeof c.timestamp === "number"
            ? c.timestamp
            : (c.createdAt?.toMillis?.() ?? Date.now());

        const item = document.createElement("div");
        item.className = "comment-item";

        // No user content inserted unescaped
        item.innerHTML = `
          <p><strong>${nameSafe}</strong></p>
          <p>${textSafe}</p>
          <small>${new Date(ts).toLocaleString()}</small>
          <button class="delete-comment" data-id="${docSnap.id}" style="${isAdmin ? "" : "display:none;"}">Delete</button>
          <hr>
        `;

        list.appendChild(item);
      });

      // bind delete after rendering
      list.querySelectorAll(".delete-comment").forEach(btn => {
        btn.addEventListener("click", async () => {
          if (!isAdmin) return alert("Only admin can delete comments.");
          try {
            await deleteDoc(doc(db, "comments", btn.dataset.id));
          } catch (err) {
            alert("Delete error: " + (err?.message || err));
          }
        });
      });
    },
    err => {
      // common case: missing index; Firestore returns a descriptive message
      alert("Realtime error: " + (err?.message || err));
    }
  );
}

// ======================================================
// SIDEBAR (AUTHORS + ESSAYS) — single source of truth
// - stable ordering via explicit arrays
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
  },
  amelina: {
    en: { name: "Victoria Amelina", url: "/UkrBooks/authors/amelina/amelinaen.html" },
    fr: { name: "Victoria Amelina", url: "/UkrBooks/authors/amelina/amelinafr.html" },
    uk: { name: "Вікторія Амеліна", url: "/UkrBooks/authors/amelina/amelinaua.html" }
    },
  kalytko: {
    en: { name: "Kateryna Kalytko", url: "/UkrBooks/authors/kalytko/kalytkoen.html" },
    fr: { name: "Kateryna Kalytko", url: "/UkrBooks/authors/kalytko/kalytkofr.html" },
    uk: { name: "Катерина Калитко", url: "/UkrBooks/authors/kalytko/kalytkoua.html" }
      },
  vakulenko: {
    en: { name: "Volodymyr Vakulenko", url: "/UkrBooks/authors/vakulenko/vakulenkoen.html" },
    fr: { name: "Volodymyr Vakulenko", url: "/UkrBooks/authors/vakulenko/vakulenkofr.html" },
    uk: { name: "Володимир Вакуленко", url: "/UkrBooks/authors/vakulenko/vakulenkoua.html" }
  },
  maksymchuk: {
    en: { name: "Oksana Maksymchuk", url: "/UkrBooks/authors/maksymchuk/maksymchuken.html" },
    fr: { name: "Oksana Maksymchuk", url: "/UkrBooks/authors/maksymchuk/maksymchukfr.html" },
    uk: { name: "Оксана Максимчук", url: "/UkrBooks/authors/maksymchuk/maksymchukua.html" }
  }
};

// explicit stable order
const AUTHORS_ORDER = ["zhadan", "kuznetsova", "amelina", "vakulenko", "maksymchuk", "kalytko"];

const ESSAYS = {
  beyond_empire: {
    en: { title: "Beyond Empire", url: "/UkrBooks/essays/beyond-empire.html" },
    fr: { title: "Au-delà de l’Empire", url: "/UkrBooks/essays/beyond-empire-fr.html" },
    uk: { title: "Поза імперією", url: "/UkrBooks/essays/beyond-empire.html-ua" }
  },

  deconstruction_identity: {
    en: { title: "Deconstruction of Identity", url: "/UkrBooks/essays/deconstruction-identity-en.html" },
    fr: { title: "Déconstruction de l’identité", url: "/UkrBooks/essays/deconstruction-identity-fr.html" },
    uk: { title: "Деконструкція ідентичності", url: "/UkrBooks/essays/deconstruction-identity-ua.html" }
  },

  we_can_do_it_again: {
    en: { title: "“We Can Do It Again”", url: "/UkrBooks/essays/we-can-do-it-again.html" },
    fr: { title: "« On peut recommencer »", url: "/UkrBooks/essays/on-peut-recommencer-fr.html" },
    uk: { title: "«Можемо повторити»", url: "/UkrBooks/essays/mozhemo-povtoryty.html-ua" }
  }
};

const ESSAYS_ORDER = [
  "beyond_empire",
  "deconstruction_identity",
  "we_can_do_it_again"
];


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

  for (const key of AUTHORS_ORDER) {
    const bundle = AUTHORS[key];
    if (!bundle) continue;

    const entry = bundle[lang] || bundle.en;
    if (!entry?.url || !entry?.name) continue;

    const li = document.createElement("li");
    li.innerHTML = `<a href="${entry.url}">${escapeHtml(entry.name)}</a>`;
    list.appendChild(li);
  }
}

function injectEssays() {
  const list = document.getElementById("essays-list");
  if (!list) return;

  list.innerHTML = "";

  for (const key of ESSAYS_ORDER) {
    const bundle = ESSAYS[key];
    if (!bundle) continue;

    const entry = bundle[lang] || bundle.en;
    if (!entry?.url || !entry?.title) continue;

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
