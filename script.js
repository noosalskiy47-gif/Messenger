// ========== FIREBASE ==========
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  get,
  push,
  onValue,
  onDisconnect,
  serverTimestamp,
  query,
  orderByChild,
  limitToLast,
  off
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBJUNVhQyeYIQyO0nhodhxIdfVFDqdLCXc",
  authDomain: "messenger-fc419.firebaseapp.com",
  databaseURL: "https://messenger-fc419-default-rtdb.firebaseio.com",
  projectId: "messenger-fc419",
  storageBucket: "messenger-fc419.firebasestorage.app",
  messagingSenderId: "671351381521",
  appId: "1:671351381521:web:0c0d33ef8768ba16b29bb0",
  measurementId: "G-V60B7MZR2X"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ========== STATE ==========
let currentUser = null;
let currentChatId = null;
let currentPartnerId = null;
let users = {};
let messagesListener = null;
let searchQuery = "";

const EMOJIS = ["😀","😂","😍","🥰","😎","🤔","👍","👎","❤️","🔥","🎉","✨","👋","🙏","💯","🚀","💬","👀","😊","🥳","😢","😡","🤝","💪","🌟","⭐","🍀","🍕","☕","🎵"];

// ========== DOM ==========
const loginScreen = document.getElementById("loginScreen");
const appEl = document.getElementById("app");
const displayNameInput = document.getElementById("displayNameInput");
const loginBtn = document.getElementById("loginBtn");
const usersListEl = document.getElementById("usersList");
const messagesEl = document.getElementById("messages");
const emptyStateEl = document.getElementById("emptyState");
const headerAvatarEl = document.getElementById("headerAvatar");
const headerNameEl = document.getElementById("headerName");
const headerStatusEl = document.getElementById("headerStatus");
const composerEl = document.getElementById("composer");
const messageInputEl = document.getElementById("messageInput");
const sendBtnEl = document.getElementById("sendBtn");
const searchInputEl = document.getElementById("searchInput");
const sidebarEl = document.getElementById("sidebar");
const menuBtnEl = document.getElementById("menuBtn");
const logoutBtnEl = document.getElementById("logoutBtn");
const myAvatarEl = document.getElementById("myAvatar");
const myNameEl = document.getElementById("myName");
const emojiBtnEl = document.getElementById("emojiBtn");
const emojiPanelEl = document.getElementById("emojiPanel");
const emojiGridEl = document.getElementById("emojiGrid");

// ========== HELPERS ==========
function getInitials(name) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function makeChatId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

// ========== AUTH ==========
async function login() {
  const name = displayNameInput.value.trim();
  if (!name || name.length < 2) {
    displayNameInput.focus();
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Вход...";

  try {
    const cred = await signInAnonymously(auth);
    await updateProfile(cred.user, { displayName: name });

    // Сохраняем пользователя в базу
    const userRef = ref(db, `users/${cred.user.uid}`);
    await set(userRef, {
      name,
      online: true,
      lastSeen: serverTimestamp(),
      avatar: getInitials(name)
    });

    // Presence
    const presenceRef = ref(db, `users/${cred.user.uid}/online`);
    await set(presenceRef, true);
    onDisconnect(presenceRef).set(false);
    onDisconnect(ref(db, `users/${cred.user.uid}/lastSeen`)).set(serverTimestamp());

  } catch (err) {
    console.error(err);
    alert("Ошибка входа: " + err.message);
    loginBtn.disabled = false;
    loginBtn.textContent = "Войти";
  }
}

function logout() {
  if (currentUser) {
    set(ref(db, `users/${currentUser.uid}/online`), false);
    set(ref(db, `users/${currentUser.uid}/lastSeen`), serverTimestamp());
  }
  signOut(auth);
}

onAuthStateChanged(auth, async (user) => {
  if (user && user.displayName) {
    currentUser = user;
    showApp();
  } else {
    currentUser = null;
    showLogin();
  }
});

function showLogin() {
  loginScreen.style.display = "flex";
  appEl.style.display = "none";
  loginBtn.disabled = false;
  loginBtn.textContent = "Войти";
}

function showApp() {
  loginScreen.style.display = "none";
  appEl.style.display = "flex";

  myNameEl.textContent = currentUser.displayName;
  myAvatarEl.textContent = getInitials(currentUser.displayName);

  listenUsers();
}

// ========== USERS ==========
function listenUsers() {
  const usersRef = ref(db, "users");
  onValue(usersRef, (snap) => {
    users = snap.val() || {};
    renderUsers();
  });
}

function renderUsers() {
  const list = Object.entries(users)
    .filter(([uid]) => uid !== currentUser.uid)
    .filter(([, u]) => {
      if (!searchQuery) return true;
      return (u.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      // Онлайн сверху
      if (a[1].online && !b[1].online) return -1;
      if (!a[1].online && b[1].online) return 1;
      return (a[1].name || "").localeCompare(b[1].name || "");
    });

  if (list.length === 0) {
    usersListEl.innerHTML = `<div style="padding:24px 16px;text-align:center;color:var(--text-muted);font-size:0.9rem;">
      ${searchQuery ? "Никого не найдено" : "Пока никого нет.<br>Открой в другой вкладке / устройстве"}
    </div>`;
    return;
  }

  usersListEl.innerHTML = list.map(([uid, u]) => {
    const isActive = uid === currentPartnerId;
    const statusText = u.online ? "онлайн" : "был(а) недавно";
    return `
      <div class="chat-item ${isActive ? "active" : ""}" data-uid="${uid}">
        <div class="avatar">
          ${u.avatar || getInitials(u.name)}
          ${u.online ? '<span class="online-dot"></span>' : ""}
        </div>
        <div class="info">
          <div class="name">${escapeHtml(u.name || "Без имени")}</div>
          <div class="preview">${statusText}</div>
        </div>
      </div>
    `;
  }).join("");

  usersListEl.querySelectorAll(".chat-item").forEach(el => {
    el.addEventListener("click", () => openChat(el.dataset.uid));
  });
}

// ========== CHAT ==========
function openChat(partnerId) {
  if (!partnerId || partnerId === currentUser.uid) return;

  // Отписываемся от предыдущего чата
  if (messagesListener && currentChatId) {
    off(ref(db, `chats/${currentChatId}/messages`));
  }

  currentPartnerId = partnerId;
  currentChatId = makeChatId(currentUser.uid, partnerId);

  const partner = users[partnerId] || {};
  headerAvatarEl.textContent = partner.avatar || getInitials(partner.name);
  headerNameEl.textContent = partner.name || "Пользователь";
  headerStatusEl.textContent = partner.online ? "онлайн" : "был(а) недавно";
  headerStatusEl.classList.toggle("online", !!partner.online);

  composerEl.style.display = "flex";
  emptyStateEl.style.display = "none";
  sidebarEl.classList.remove("open");

  renderUsers();
  listenMessages();
  messageInputEl.focus();
}

function listenMessages() {
  messagesEl.innerHTML = "";
  const messagesRef = query(
    ref(db, `chats/${currentChatId}/messages`),
    orderByChild("timestamp"),
    limitToLast(100)
  );

  messagesListener = onValue(messagesRef, (snap) => {
    const data = snap.val() || {};
    const msgs = Object.entries(data)
      .map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    renderMessages(msgs);
  });
}

function renderMessages(msgs) {
  if (msgs.length === 0) {
    messagesEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👋</div>
        <p>Напишите первое сообщение</p>
      </div>`;
    return;
  }

  messagesEl.innerHTML = msgs.map(m => {
    const isOut = m.from === currentUser.uid;
    return `
      <div class="message ${isOut ? "out" : "in"}">
        ${!isOut ? `<div class="sender-name">${escapeHtml(m.name || "")}</div>` : ""}
        <div class="bubble">${escapeHtml(m.text)}</div>
        <div class="meta">
          <span>${formatTime(m.timestamp)}</span>
          ${isOut ? '<span>✓</span>' : ""}
        </div>
      </div>
    `;
  }).join("");

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function sendMessage() {
  const text = messageInputEl.value.trim();
  if (!text || !currentChatId) return;

  messageInputEl.value = "";

  const msgRef = push(ref(db, `chats/${currentChatId}/messages`));
  await set(msgRef, {
    text,
    from: currentUser.uid,
    name: currentUser.displayName,
    timestamp: Date.now()
  });
}

// ========== EMOJI ==========
function initEmoji() {
  emojiGridEl.innerHTML = EMOJIS.map(e => `<span data-emoji="${e}">${e}</span>`).join("");
  emojiGridEl.querySelectorAll("span").forEach(el => {
    el.addEventListener("click", () => {
      const emoji = el.dataset.emoji;
      const input = messageInputEl;
      const start = input.selectionStart;
      input.value = input.value.slice(0, start) + emoji + input.value.slice(input.selectionEnd);
      input.focus();
      input.selectionStart = input.selectionEnd = start + emoji.length;
      emojiPanelEl.classList.remove("open");
    });
  });
}

// ========== EVENTS ==========
loginBtn.addEventListener("click", login);
displayNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") login();
});

sendBtnEl.addEventListener("click", sendMessage);
messageInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

searchInputEl.addEventListener("input", () => {
  searchQuery = searchInputEl.value;
  renderUsers();
});

menuBtnEl.addEventListener("click", () => sidebarEl.classList.toggle("open"));
logoutBtnEl.addEventListener("click", logout);

emojiBtnEl.addEventListener("click", (e) => {
  e.stopPropagation();
  emojiPanelEl.classList.toggle("open");
});

document.addEventListener("click", (e) => {
  if (!emojiPanelEl.contains(e.target) && e.target !== emojiBtnEl) {
    emojiPanelEl.classList.remove("open");
  }
});

// ========== INIT ==========
initEmoji();
displayNameInput.focus();
