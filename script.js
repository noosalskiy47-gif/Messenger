// ========== DATA ==========
const EMOJIS = ["😀","😂","😍","🥰","😎","🤔","👍","👎","❤️","🔥","🎉","✨","👋","🙏","💯","🚀","💬","👀","😊","🥳","😢","😡","🤝","💪","🌟","⭐","🍀","🍕","☕","🎵"];

const DEFAULT_CHATS = [
  {
    id: "1",
    name: "Анна",
    avatar: "А",
    status: "онлайн",
    messages: [
      { id: 1, text: "Привет! Как дела?", from: "in", time: "10:12" },
      { id: 2, text: "Привет! Всё отлично, работаю над новым проектом 🚀", from: "out", time: "10:14" },
      { id: 3, text: "Круто! Расскажешь потом?", from: "in", time: "10:15" },
      { id: 4, text: "Конечно, вечером созвонимся", from: "out", time: "10:16" }
    ]
  },
  {
    id: "2",
    name: "Команда проекта",
    avatar: "К",
    status: "3 участника",
    messages: [
      { id: 1, text: "Ребята, дедлайн через 2 дня", from: "in", time: "09:40" },
      { id: 2, text: "Я почти закончил свою часть", from: "out", time: "09:45" },
      { id: 3, text: "Отлично, жду PR", from: "in", time: "09:47" }
    ]
  },
  {
    id: "3",
    name: "Максим",
    avatar: "М",
    status: "был(а) 25 мин. назад",
    messages: [
      { id: 1, text: "Кинь ссылку на репозиторий", from: "in", time: "Вчера" },
      { id: 2, text: "https://github.com/example/messenger", from: "out", time: "Вчера" },
      { id: 3, text: "Спасибо!", from: "in", time: "Вчера" }
    ]
  },
  {
    id: "4",
    name: "Елена",
    avatar: "Е",
    status: "онлайн",
    messages: [
      { id: 1, text: "Не забывай про встречу в 15:00", from: "in", time: "08:30" },
      { id: 2, text: "Помню, буду!", from: "out", time: "08:32" }
    ]
  },
  {
    id: "5",
    name: "Алексей",
    avatar: "А",
    status: "был(а) недавно",
    messages: [
      { id: 1, text: "Посмотри новый дизайн", from: "in", time: "Пн" }
    ]
  }
];

// ========== STATE ==========
let chats = [];
let currentChatId = null;
let searchQuery = "";

// ========== DOM ==========
const chatsListEl = document.getElementById("chatsList");
const messagesEl = document.getElementById("messages");
const emptyStateEl = document.getElementById("emptyState");
const chatHeaderEl = document.getElementById("chatHeader");
const headerAvatarEl = document.getElementById("headerAvatar");
const headerNameEl = document.getElementById("headerName");
const headerStatusEl = document.getElementById("headerStatus");
const composerEl = document.getElementById("composer");
const messageInputEl = document.getElementById("messageInput");
const sendBtnEl = document.getElementById("sendBtn");
const searchInputEl = document.getElementById("searchInput");
const sidebarEl = document.getElementById("sidebar");
const menuBtnEl = document.getElementById("menuBtn");
const newChatBtnEl = document.getElementById("newChatBtn");
const newChatModalEl = document.getElementById("newChatModal");
const newChatNameEl = document.getElementById("newChatName");
const cancelNewChatEl = document.getElementById("cancelNewChat");
const createNewChatEl = document.getElementById("createNewChat");
const emojiBtnEl = document.getElementById("emojiBtn");
const emojiPanelEl = document.getElementById("emojiPanel");
const emojiGridEl = document.getElementById("emojiGrid");

// ========== STORAGE ==========
function loadChats() {
  const saved = localStorage.getItem("grok-messenger-chats");
  if (saved) {
    try {
      chats = JSON.parse(saved);
      return;
    } catch (e) {}
  }
  chats = JSON.parse(JSON.stringify(DEFAULT_CHATS));
  saveChats();
}

function saveChats() {
  localStorage.setItem("grok-messenger-chats", JSON.stringify(chats));
}

// ========== HELPERS ==========
function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function getLastMessage(chat) {
  if (!chat.messages.length) return { text: "Нет сообщений", time: "" };
  return chat.messages[chat.messages.length - 1];
}

function getInitials(name) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

// ========== RENDER ==========
function renderChats() {
  const filtered = chats.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filtered.length === 0) {
    chatsListEl.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.9rem;">Ничего не найдено</div>`;
    return;
  }

  chatsListEl.innerHTML = filtered.map(chat => {
    const last = getLastMessage(chat);
    const isActive = chat.id === currentChatId;
    const preview = last.from === "out" ? `Вы: ${last.text}` : last.text;

    return `
      <div class="chat-item ${isActive ? "active" : ""}" data-id="${chat.id}">
        <div class="avatar">${chat.avatar || getInitials(chat.name)}</div>
        <div class="info">
          <div class="name-row">
            <span class="name">${escapeHtml(chat.name)}</span>
            <span class="time">${last.time}</span>
          </div>
          <div class="preview">${escapeHtml(preview)}</div>
        </div>
      </div>
    `;
  }).join("");

  // Click handlers
  chatsListEl.querySelectorAll(".chat-item").forEach(el => {
    el.addEventListener("click", () => selectChat(el.dataset.id));
  });
}

function renderMessages(chatId) {
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return;

  emptyStateEl.style.display = "none";
  messagesEl.innerHTML = "";

  if (chat.messages.length === 0) {
    messagesEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👋</div>
        <p>Напишите первое сообщение</p>
      </div>
    `;
    return;
  }

  chat.messages.forEach(msg => {
    const div = document.createElement("div");
    div.className = `message ${msg.from}`;
    div.innerHTML = `
      <div class="bubble">${escapeHtml(msg.text)}</div>
      <div class="meta">
        <span>${msg.time}</span>
        ${msg.from === "out" ? '<span class="status">✓✓</span>' : ""}
      </div>
    `;
    messagesEl.appendChild(div);
  });

  // Scroll to bottom
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function updateHeader(chat) {
  if (!chat) {
    headerAvatarEl.textContent = "?";
    headerNameEl.textContent = "Выберите чат";
    headerStatusEl.textContent = "—";
    headerStatusEl.classList.remove("online");
    composerEl.style.display = "none";
    return;
  }

  headerAvatarEl.textContent = chat.avatar || getInitials(chat.name);
  headerNameEl.textContent = chat.name;
  headerStatusEl.textContent = chat.status;
  headerStatusEl.classList.toggle("online", chat.status === "онлайн");
  composerEl.style.display = "flex";
}

// ========== ACTIONS ==========
function selectChat(id) {
  currentChatId = id;
  const chat = chats.find(c => c.id === id);

  renderChats();
  renderMessages(id);
  updateHeader(chat);

  // Close sidebar on mobile
  sidebarEl.classList.remove("open");
  messageInputEl.focus();
}

function sendMessage() {
  const text = messageInputEl.value.trim();
  if (!text || !currentChatId) return;

  const chat = chats.find(c => c.id === currentChatId);
  if (!chat) return;

  const newMsg = {
    id: Date.now(),
    text,
    from: "out",
    time: getCurrentTime()
  };

  chat.messages.push(newMsg);
  saveChats();

  messageInputEl.value = "";
  renderMessages(currentChatId);
  renderChats();

  // Simulate reply after delay (только для демо)
  if (Math.random() > 0.4) {
    setTimeout(() => {
      const replies = [
        "Понял 👍",
        "Ок, сделаю",
        "Интересно!",
        "Согласен",
        "Давай подробнее",
        "Хорошо, спасибо",
        "🔥",
        "Отличная идея"
      ];
      const reply = {
        id: Date.now() + 1,
        text: replies[Math.floor(Math.random() * replies.length)],
        from: "in",
        time: getCurrentTime()
      };
      chat.messages.push(reply);
      saveChats();
      if (currentChatId === chat.id) {
        renderMessages(currentChatId);
      }
      renderChats();
    }, 1200 + Math.random() * 1800);
  }
}

function createChat() {
  const name = newChatNameEl.value.trim();
  if (!name) return;

  const newChat = {
    id: Date.now().toString(),
    name,
    avatar: getInitials(name),
    status: "онлайн",
    messages: []
  };

  chats.unshift(newChat);
  saveChats();
  closeNewChatModal();
  selectChat(newChat.id);
  renderChats();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ========== MODAL & EMOJI ==========
function openNewChatModal() {
  newChatModalEl.classList.add("open");
  newChatNameEl.value = "";
  newChatNameEl.focus();
}

function closeNewChatModal() {
  newChatModalEl.classList.remove("open");
}

function toggleEmojiPanel() {
  emojiPanelEl.classList.toggle("open");
}

function insertEmoji(emoji) {
  const input = messageInputEl;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
  input.focus();
  input.selectionStart = input.selectionEnd = start + emoji.length;
  emojiPanelEl.classList.remove("open");
}

function initEmojiPanel() {
  emojiGridEl.innerHTML = EMOJIS.map(e => `<span data-emoji="${e}">${e}</span>`).join("");
  emojiGridEl.querySelectorAll("span").forEach(el => {
    el.addEventListener("click", () => insertEmoji(el.dataset.emoji));
  });
}

// ========== EVENTS ==========
sendBtnEl.addEventListener("click", sendMessage);

messageInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

searchInputEl.addEventListener("input", () => {
  searchQuery = searchInputEl.value;
  renderChats();
});

menuBtnEl.addEventListener("click", () => {
  sidebarEl.classList.toggle("open");
});

newChatBtnEl.addEventListener("click", openNewChatModal);
cancelNewChatEl.addEventListener("click", closeNewChatModal);
createNewChatEl.addEventListener("click", createChat);

newChatNameEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") createChat();
});

emojiBtnEl.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleEmojiPanel();
});

document.addEventListener("click", (e) => {
  if (!emojiPanelEl.contains(e.target) && e.target !== emojiBtnEl) {
    emojiPanelEl.classList.remove("open");
  }
});

// Close modal on backdrop click
newChatModalEl.addEventListener("click", (e) => {
  if (e.target === newChatModalEl) closeNewChatModal();
});

// ========== INIT ==========
function init() {
  loadChats();
  initEmojiPanel();
  renderChats();

  // Auto-select first chat on desktop
  if (window.innerWidth > 768 && chats.length) {
    selectChat(chats[0].id);
  }
}

init();
