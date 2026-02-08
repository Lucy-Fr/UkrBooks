import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  query, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

function normalizePageId(pathname) {
  let p = pathname || "/";
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  if (p.endsWith("/index.html")) p = p.slice(0, -"/index.html".length) || "/";
  return p;
}

const pageId = normalizePageId(window.location.pathname);

function detectLanguage() {
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
        timestamp: Date.now()
      });

      form.reset();
    });
  }

  injectSidebars();
  loadComments();
});

let unsubscribe = null;

const UI_LABELS = {
  en: { del: "Delete", onlyAdmin: "Only admin can delete comments." },
  fr: { del: "Supprimer", onlyAdmin: "Seul l’admin peut supprimer les commentaires." },
  uk: { del: "Видалити", onlyAdmin: "Лише адміністратор може видаляти коментарі." }
};

function loadComments() {
  const list = document.getElementById("commentsList");
  if (!list) return;

  const labels = UI_LABELS[lang] || UI_LABELS.en;
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
        <button class="delete-comment" data-id="${docSnap.id}" style="${isAdmin ? "" : "display:none;"}">
          ${labels.del}
        </button>
        <hr>
      `;

      list.appendChild(item);
    });

    list.querySelectorAll(".delete-comment").forEach(btn => {
      btn.onclick = async () => {
        const labels2 = UI_LABELS[lang] || UI_LABELS.en;
        if (!isAdmin) return alert(labels2.onlyAdmin);
        await deleteDoc(doc(db, "comments", btn.dataset.id));
      };
    });
  });
}

const SIDEBAR_LABELS = {
  en: { authors: "Authors", essays: "Essays" },
  fr: { authors: "Auteurs", essays: "Essais" },
  uk: { authors: "Автори",  essays: "Есеї" }
};

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
    en: { name: "Volodymyr Vakulenko", url: "/UkrBooks/authors/vakulenko/vakulenkoen.html" },
    fr: { name: "Volodymyr Vakoulenko", url: "/UkrBooks/authors/vakulenko/vakulenkofr.html" },
    uk: { name: "Володимир Вакуленко", url: "/UkrBooks/authors/vakulenko/vakulenkoua.html" }
  },
  amelina: {
    order: 40,
    en: { name: "Victoria Amelina", url: "/UkrBooks/authors/amelina/amelinaen.html" },
    fr: { name: "Viktoria Amelina", url: "/UkrBooks/authors/amelina/amelinafr.html" },
    uk: { name: "Вікторія Амеліна",  url: "/UkrBooks/authors/amelina/amelinaua.html" }
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

  const keys = Object.keys(AUTHORS).sort((a, b) => (AUTHORS[a].order ?? 9999) - (AUTHORS[b].order ?? 9999));

  for (const key of keys) {
    const entry = AUTHORS[key][lang] || AUTHORS[key].en;
    const li = document.createElement("li");
    li.innerHTML = `<a href="${entry.url}">${entry.name}</a>`;
    list.appendChild(li);
  }
}

function injectEssays() {
  const list = document.getElementById("essays-list");
  if (!list) return;

  list.innerHTML = "";

  const keys = Object.keys(ESSAYS).sort((a, b) => (ESSAYS[a].order ?? 9999) - (ESSAYS[b].order ?? 9999));

  for (const key of keys) {
    const entry = ESSAYS[key][lang] || ESSAYS[key].en;
    const li = document.createElement("li");
    li.innerHTML = `<a href="${entry.url}">${entry.title}</a>`;
    list.appendChild(li);
  }
}

function injectSidebars() {
  injectSidebarTitles();
  injectAuthors();
  injectEssays();
}
