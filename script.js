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
// Page ID
// ------------------------------------------------------
function normalizePathname(pathname) {
  let p = pathname || "/";
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  if (p.endsWith("/index.html")) p = p.slice(0, -"/index.html".length) || "/";
  return p;
}

function getStablePageId() {
  const main = document.querySelector("main.content[data-page-id]");
  const attr = main?.getAttribute("data-page-id");
  if (attr && attr.trim()) return attr.trim();
  return normalizePathname(window.location.pathname);
}

const pageId = getStablePageId();

// ------------------------------------------------------
// Language detection
// ------------------------------------------------------
function detectLanguage() {
  const main = document.querySelector("main.content[data-lang]");
  let forced = (main?.getAttribute("data-lang") || "").toLowerCase().trim();
  if (forced === "ua") forced = "uk";
  if (forced === "en" || forced === "fr" || forced === "uk") return forced;

  let l = (document.documentElement.lang || "").toLowerCase().trim();
  if (l === "ua") l = "uk";
  if (l === "en" || l === "fr" || l === "uk") return l;

  const path = window.location.pathname.toLowerCase();
  const file = (path.split("/").pop() || "").toLowerCase();
  const segments = path.split("/").filter(Boolean);

  if (/(^|[-_])(ua|uk)\.html$/.test(file) || segments.includes("ua") || segments.includes("uk")) return "uk";
  if (/(^|[-_])fr\.html$/.test(file) || segments.includes("fr")) return "fr";
  if (/(^|[-_])en\.html$/.test(file) || segments.includes("en")) return "en";

  return "en";
}

const lang = detectLanguage();

// ------------------------------------------------------
// Admin state
// ------------------------------------------------------
let isAdmin = false;

onAuthStateChanged(auth, user => {
  isAdmin = !!(user && user.email === "garmash110@gmail.com");
  loadComments();
});

// ------------------------------------------------------
// Labels
// ------------------------------------------------------
const SIDEBAR_LABELS = {
  en: { authors: "Authors", essays: "Essays" },
  fr: { authors: "Auteurs", essays: "Essais" },
  uk: { authors: "Автори", essays: "Есеї" }
};

// ------------------------------------------------------
// Sidebar data
// ------------------------------------------------------
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

  // ------------------- INSERTED -------------------
  deconstruction_identity: {
    order: 30,
    en: { title: "After the Center: Deconstruction of Identity", url: "/UkrBooks/essays/deconstruction-identity-en.html" },
    uk: { title: "Після центру: Деконструкція ідентичності", url: "/UkrBooks/essays/deconstruction-identity-ua.html" },
    fr: { title: "Après le Centre : Déconstruction de l'identité", url: "/UkrBooks/essays/deconstruction-identity-fr.html" }
  }
  // ------------------- INSERTED END -------------------
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

function injectEssays() {
  const list = document.getElementById("essays-list");
  if (!list) return;

  list.innerHTML = "";

  const keys = Object.keys(ESSAYS).sort(
    (a, b) => (ESSAYS[a].order ?? 9999) - (ESSAYS[b].order ?? 9999)
  );

  for (const key of keys) {
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
  injectEssays();
}
