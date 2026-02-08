// ======================================================
// CLEAN UNIVERSAL FIREBASE COMMENTS + SIDEBAR (AUTHORS + ESSAYS)
// ======================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  query, where, orderBy, onSnapshot
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

// ------------------------------------------------------
// Page ID: prefer stable data-page-id, fallback to pathname
// ------------------------------------------------------
function normalizePathname(pathname) {
  let p = pathname || "/";
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  if (p.endsWith("/index.html")) p = p.slice(0, -"/index.html".length) || "/";
  return p;
}

function getStablePageId() {
  // если на странице есть <main class="content" data-page-id="...">
  const main = document.querySelector("main.content[data-page-id]");
  const attr = main?.getAttribute("data-page-id");
  if (attr && attr.trim()) return attr.trim();
  // иначе — по пути
  return normalizePathname(window.location.pathname);
}

const pageId = getStablePageId();

// ------------------------------------------------------
// Language detection (FIXED: stable + sidebar-safe)
// ------------------------------------------------------
function detectLanguage() {
  // 1) if page sets <main data-lang="..."> (recommended), use it
  const main = document.querySelector("main.content[data-lang]");
  let forced = (main?.getAttribute("data-lang") || "").toLowerCase().trim();
  if (forced === "ua") forced = "uk";
  if (forced === "en" || forced === "fr" || forced === "uk") return forced;

  // 2) <html lang="...">
  let l = (document.documentElement.lang || "").toLowerCase().trim();
  if (l === "ua") l = "uk";
  if (l === "en" || l === "fr" || l === "uk") return l;

  // 3) pathname heuristics
  const path = window.location.pathname.toLowerCase();
  const file = (path.split("/").pop() || "").toLowerCase();
  const segments = path.split("/").filter(Boolean);

  if (/(^|[-_])(ua|uk)\.html$/.test(file) || segments.includes("ua") || segments.includes("uk")) return "uk";
  if (/(^|[-_])fr\.html$/.test(file) || segments.includes("fr")) return "fr";
  if (/(^|[-_])en\.html$/.test(file) || segments.includes("en")) return "en";

  return "en";
}

const lang = detectLanguage();


// ✅ INSERTED ------------------------------------------------------
// FIX language switch on author pages (prevents /authors/<slug>/<slug>.html)
// Requires: <nav class="language-switch"><a>UA</a><a>FR</a><a>EN</a></nav>
// ------------------------------------------------------
function fixLanguageSwitchLinks() {
  const nav = document.querySelector("nav.language-switch");
  if (!nav) return;

  const links = nav.querySelectorAll("a");
  if (!links.length) return;

  const path = window.location.pathname;

  // Only for author pages: /UkrBooks/authors/<slug>/<file>
  const m = path.match(/\/UkrBooks\/authors\/([^/]+)\/[^/]+$/i);
  if (!m) return;

  const slug = m[1];

  // Your real filenames:
  // /authors/<slug>/<slug>ua.html | <slug>en.html | <slug>fr.html
  const map = {
    ua: `/UkrBooks/authors/${slug}/${slug}ua.html`,
    uk: `/UkrBooks/authors/${slug}/${slug}ua.html`,
    en: `/UkrBooks/authors/${slug}/${slug}en.html`,
    fr: `/UkrBooks/authors/${slug}/${slug}fr.html`,
  };

  links.forEach(a => {
    const key = (a.textContent || "").trim().toLowerCase();
    if (map[key]) a.href = map[key];
  });
}
// ✅ INSERTED END --------------------------------------------------


// ------------------------------------------------------
// Admin state
// ------------------------------------------------------
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

  // при смене статуса админа перерисуем комментарии (кнопки delete)
  loadComments();
});

window.adminLogin = async function () {
  try {
    const pwd = prompt("Admin password:");
    if (!pwd) return;
    await signInWithEmailAndPassword(auth, "garmash110@gmail.com", pwd);
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

// ------------------------------------------------------
// Labels
// ------------------------------------------------------
const UI_LABELS = {
  en: { del: "Delete", onlyAdmin: "Only admin can delete comments." },
  fr: { del: "Supprimer", onlyAdmin: "Seul l’admin peut supprimer les commentaires." },
  uk: { del: "Видалити", onlyAdmin: "Лише адміністратор може видаляти коментарі." }
};

const SIDEBAR_LABELS = {
  en: { authors: "Authors", essays: "Essays" },
  fr: { authors: "Auteurs", essays: "Essais" },
  uk: { authors: "Автори",  essays: "Есеї" }
};

// ------------------------------------------------------
// Comments (SAFE render + query by page only)
// ------------------------------------------------------
let unsubscribe = null;

function renderComment(listEl, c, docId) {
  const labels = UI_LABELS[lang] || UI_LABELS.en;

  const item = document.createElement("div");
  item.className = "comment-item";

  const pName = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = c.name || "";
  pName.appendChild(strong);

  const pText = document.createElement("p");
  pText.textContent = c.text || "";

  const small = document.createElement("small");
  const ts = typeof c.timestamp === "number" ? c.timestamp : Date.now();
  small.textContent = new Date(ts).toLocaleString();

  const btn = document.createElement("button");
  btn.className = "delete-comment";
  btn.dataset.id = docId;
  btn.textContent = labels.del;

  // show/hide
  btn.style.display = isAdmin ? "inline-block" : "none";

  btn.onclick = async () => {
    const labels2 = UI_LABELS[lang] || UI_LABELS.en;
    if (!isAdmin) return alert(labels2.onlyAdmin);
    await deleteDoc(doc(db, "comments", docId));
  };

  const hr = document.createElement("hr");

  item.appendChild(pName);
  item.appendChild(pText);
  item.appendChild(small);
  item.appendChild(btn);
  item.appendChild(hr);

  listEl.appendChild(item);
}

function loadComments() {
  const list = document.getElementById("commentsList");
  if (!list) return;

  // остановить предыдущую подписку
  if (unsubscribe) unsubscribe();

  // ВАЖНО: грузим только нужную страницу
  const q = query(
    collection(db, "comments"),
    where("page", "==", pageId),
    orderBy("timestamp", "desc")
  );

  unsubscribe = onSnapshot(q, snapshot => {
    list.innerHTML = "";

    snapshot.forEach(docSnap => {
      const c = docSnap.data();
      renderComment(list, c, docSnap.id);
    });
  });
}

// ------------------------------------------------------
// Submit comment
// ------------------------------------------------------
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
        page: pageId,      // теперь стабильно
        name,
        text,
        lang,
        timestamp: Date.now()
      });

      form.reset();
    });
  }

  // ✅ INSERTED: fix language links BEFORE rendering sidebars
  fixLanguageSwitchLinks();

  injectSidebars();
  loadComments();
});

// ------------------------------------------------------
// Sidebar data
// ------------------------------------------------------
const AUTHORS = {
  zhadan: {
    order: 10,
    en: { name: "Serhiy Zhadan", url: "/UkrBooks/authors/zhadan/zhadanen.html" },
    fr: { name: "Serhiy Jadan",  url: "/UkrBooks/authors/zhadan/zhadanfr.html" },
    uk: { name: "Сергій Жадан",  url: "/UkrBooks/authors/zhadan/zhadanua.html" }
  },
  kuznetsova: {
    order: 20,
    en: { name: "Yevheniia Kuznietsova", url: "/UkrBooks/authors/kuznetsova/kuznetsovaen.html" },
    fr: { name: "Ievheniia Kuznietsova", url: "/UkrBooks/authors/kuznetsova/kuznetsovafr.html" },
    uk: { name: "Євгенія Кузнєцова",     url: "/UkrBooks/authors/kuznetsova/kuznetsovaua.html" }
  },
  vakulenko: {
    order: 30,
    en: { name: "Volodymyr Vakulenko",  url: "/UkrBooks/authors/vakulenko/vakulenkoen.html" },
    fr: { name: "Volodymyr Vakoulenko", url: "/UkrBooks/authors/vakulenko/vakulenkofr.html" },
    uk: { name: "Володимир Вакуленко",  url: "/UkrBooks/authors/vakulenko/vakulenkoua.html" }
  },
  maksymchuk: {
    order: 35,
    en: { name: "Oksana Maksymchuk", url: "/UkrBooks/authors/maksymchuk/maksymchuken.html" },
    fr: { name: "Oksana Maksymchuk", url: "/UkrBooks/authors/maksymchuk/maksymchukfr.html" },
    uk: { name: "Оксана Максимчук",  url: "/UkrBooks/authors/maksymchuk/maksymchukua.html" }
  },
  amelina: {
    order: 40,
    en: { name: "Victoria Amelina", url: "/UkrBooks/authors/amelina/amelinaen.html" },
    fr: { name: "Viktoria Amelina", url: "/UkrBooks/authors/amelina/amelinafr.html" },
    uk: { name: "Вікторія Амеліна", url: "/UkrBooks/authors/amelina/amelinaua.html" }
  }
};

const ESSAYS = {
  beyond_empire: {
    order: 10,
    en: { title: "Beyond Empire", url: "/UkrBooks/essays/beyond-empire.html" },
    fr: { title: "Au-delà de l’Empire", url: "/UkrBooks/essays/beyond-empire-fr.html" },
    uk: { title: "Поза імперією", url: "/UkrBooks/essays/beyond-empire-ua.html" }
  },
  we_can_do_it_again: {
    order: 20,
    en: { title: "“We Can Do It Again”", url: "/UkrBooks/essays/can_repeat_en.html" },
    fr: { title: "« On peut recommencer »", url: "/UkrBooks/essays/can_repeat_fr.html" },
    uk: { title: "«Можемо повторити»", url: "/UkrBooks/essays/can_repeat_ua.html" }
  },

  // ✅ INSERTED: NEW ESSAY (essays folder)
  deconstruction_identity: {
    order: 30,
    en: { title: "After the Center: Deconstruction of Identity", url: "/UkrBooks/essays/deconstruction-identity-en.html" },
    uk: { title: "Після центру: Деконструкція ідентичності", url: "/UkrBooks/essays/deconstruction-identity-ua.html" },
    fr: { title: "Après le Centre : Déconstruction de l'identité", url: "/UkrBooks/essays/deconstruction-identity-fr.html" }
  }
};

// ------------------------------------------------------
// Sidebar injectors
// ------------------------------------------------------
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

  const keys = Object.keys(AUTHORS).sort(
    (a, b) => (AUTHORS[a].order ?? 9999) - (AUTHORS[b].order ?? 9999)
  );

  for (const key of keys) {
    // FIX: fallback lang -> uk -> en (prevents accidental EN on UA pages)
    const entry = AUTHORS[key][lang] || AUTHORS[key].uk || AUTHORS[key].en;

    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = entry.url;
    a.textContent = entry.name;
    li.appendChild(a);
    list.appendChild(li);
  }
}

function injectEssays() {
  const list = document.getElementById("essays-list");
  if (!list) return;

  list.innerHTML = "";

  const keys = Object.keys(ESSAYS).sort(
    (a, b) => (ESSAYS[a].order ?? 9999) - (ESSAYS[b].order ?? 9999)
  );

  for (const key of keys) {
    // FIX: fallback lang -> uk -> en
    const entry = ESSAYS[key][lang] || ESSAYS[key].uk || ESSAYS[key].en;

    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = entry.url;
    a.textContent = entry.title;
    li.appendChild(a);
    list.appendChild(li);
  }
}

function injectSidebars() {
  injectSidebarTitles();
  injectAuthors();
  injectEssays();
}
