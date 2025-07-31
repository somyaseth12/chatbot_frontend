const BASE_URL = "https://chatbot-backend-cxaf.onrender.com";

const chatMessages = document.getElementById("chatlog"),
  userInput = document.getElementById("userInput"),
  sendBtn = document.getElementById("handleSend"),
  voiceBtn = document.getElementById("voice-btn"),
  typingElem = document.getElementById("typing"),
  suggestionsContainer = document.getElementById("suggestions");

async function loadSuggestions() {
  try {
    let res = await fetch(`${BASE_URL}/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "" }),
    });
    let data = await res.json();
    renderSuggestions(data.suggestions || []);
  } catch (err) {
    console.error("Suggestion fetch error:", err);
  }
}

function renderSuggestions(suggestions) {
  suggestionsContainer.innerHTML = "";
  suggestions.forEach(suggestion => {
    let btn = document.createElement("button");
    btn.className = "suggestion-btn";
    btn.textContent = suggestion;
    btn.onclick = () => {
      userInput.value = suggestion;
      handleSend();
    };
    suggestionsContainer.appendChild(btn);
  });
}

function appendMessage(className, text) {
  let msgDiv = document.createElement("div");
  msgDiv.className = className;
  let contentDiv = document.createElement("div");
  contentDiv.className = "message-content";
  let iconHTML =
    className === "bot-msg"
      ? '<img src="/static/bot-icon.png" alt="Bot" class="bot-icon">'
      : '<i class="fa-solid fa-user" style="margin-right: 6px; color: #ff5912;"></i>';

  if (className === "bot-msg" && text === "typing") {
    msgDiv.classList.add("typing-indicator");
    contentDiv.innerHTML = `
      ${iconHTML}
      <span class="typing-dots">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </span>
    `;
  } else {
    contentDiv.innerHTML = `${iconHTML}${text}`;
  }

  msgDiv.appendChild(contentDiv);
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function handleSend() {
  let message = userInput.value.trim();
  if (!message) return;

  appendMessage("user-msg", message);
  saveToMemory("user", message);
  userInput.value = "";
  appendMessage("bot-msg", "typing");

  try {
    let res = await fetch(`${BASE_URL}/get-response`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    let data = await res.json();
    document.querySelector(".typing-indicator")?.remove();
    appendMessage("bot-msg", data.response);
    saveToMemory("bot", data.response);
    renderSuggestions(data.suggestions || []);
  } catch (err) {
    console.error("Fetch error:", err);
    document.querySelector(".typing-indicator")?.remove();
    appendMessage("bot-msg", "Sorry, something went wrong.");
  }
}

function saveToMemory(role, text) {
  let history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
  history.push({ role, text });
  localStorage.setItem("chatHistory", JSON.stringify(history));
}

function loadChatHistory() {
  let history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
  history.forEach(({ role, text }) => {
    appendMessage(role === "bot" ? "bot-msg" : "user-msg", text);
  });
}

function clearHistory() {
  localStorage.removeItem("chatHistory");
  chatMessages.innerHTML = "";
  let firstMsg = "🤖 Hi! I’m Kodee, your AI assistant. How can I help you today?";
  appendMessage("bot-msg first-msg", firstMsg);
  saveToMemory("bot", firstMsg);
  loadSuggestions();
}

function toggleTheme() {
  document.body.classList.toggle("dark-theme");
  localStorage.setItem("theme", document.body.classList.contains("dark-theme") ? "dark" : "light");
}

function applyTheme() {
  let stored = localStorage.getItem("theme");
  let prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (stored === "dark" || (!stored && prefersDark)) {
    document.body.classList.add("dark-theme");
  } else {
    document.body.classList.remove("dark-theme");
  }
}

function toggleChatbox() {
  let container = document.getElementById("chat-container"),
    popup = document.getElementById("chat-popup"),
    isOpen = container.style.display === "block";
  container.style.display = isOpen ? "none" : "block";
  popup.style.display = isOpen ? "block" : "none";
  if (!isOpen) {
    userInput.focus();
    loadSuggestions();
  }
}

document.getElementById("close-chat-btn").onclick = () => {
  document.getElementById("chat-container").style.display = "none";
  document.getElementById("chat-popup").style.display = "block";
};

// Voice Input
if ("webkitSpeechRecognition" in window) {
  let recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";
  voiceBtn.style.display = "inline-flex";
  voiceBtn.addEventListener("click", () => {
    recognition.start();
    voiceBtn.classList.add("listening");
  });
  recognition.onresult = e => {
    let transcript = e.results[0][0].transcript.trim();
    if (transcript) {
      userInput.value = transcript;
      handleSend();
    } else {
      alert("Didn't catch that. Try again.");
    }
  };
  recognition.onend = () => {
    voiceBtn.classList.remove("listening");
  };
  recognition.onerror = e => {
    console.error("Speech recognition error:", e.error);
  };
} else {
  voiceBtn.style.display = "none";
}

// Feedback Modal
const emojiBtn = document.getElementById("emoji-feedback-btn"),
  modal = document.getElementById("rating-modal"),
  ratingButtonsDiv = document.getElementById("rating-buttons");
let selectedRating = null;

for (let i = 1; i <= 10; i++) {
  let btn = document.createElement("button");
  btn.innerText = i;
  btn.style.cssText = "width: 32px; height: 32px; border-radius: 5px; border: 1px solid #ccc; background: #c9c9c9;";
  btn.onclick = () => {
    selectedRating = i;
    [...ratingButtonsDiv.children].forEach(b => {
      b.style.background = "white";
      b.style.color = "black";
    });
    btn.style.background = "#ff5912";
    btn.style.color = "white";
  };
  ratingButtonsDiv.appendChild(btn);
}

function closeRatingModal() {
  modal.style.display = "none";
  selectedRating = null;
  [...ratingButtonsDiv.children].forEach(e => {
    e.style.background = "white";
    e.style.color = "black";
  });
  document.getElementById("rating-comment").value = "";
}

function submitRating() {
  let comment = document.getElementById("rating-comment").value;
  if (!selectedRating) return alert("Please select a rating between 1 and 10.");
  fetch(`${BASE_URL}/submit-feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating: selectedRating, comment }),
  })
    .then(res => res.json())
    .then(() => {
      modal.innerHTML = "<p style='text-align: center;'>🎉 Thanks for your feedback!</p>";
      setTimeout(() => closeRatingModal(), 1500);
    })
    .catch(err => {
      alert("Error submitting feedback");
      console.error(err);
    });
}

emojiBtn.onclick = () => {
  modal.style.display = "block";
};

window.addEventListener("load", () => {
  applyTheme();
  let history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
  if (history.length === 0) {
    let welcome = "🤖 Hi! I’m Kodee, Hirebie AI sales expert. How can I help you today?";
    appendMessage("bot-msg first-msg", welcome);
    saveToMemory("bot", welcome);
  } else {
    loadChatHistory();
  }
  loadSuggestions();
  setTimeout(() => {
    if (document.getElementById("chat-container").style.display !== "block") {
      document.getElementById("chat-popup").style.display = "block";
    }
  }, 3000);
  userInput.focus();
});

sendBtn.addEventListener("click", handleSend);
userInput.addEventListener("keypress", e => {
  if (e.key === "Enter") handleSend();
});
