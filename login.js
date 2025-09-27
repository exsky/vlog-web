const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const statusDiv = document.getElementById("status");

const API_BASE = "https://iwlw3i3ys4.execute-api.ap-northeast-1.amazonaws.com/prod";

async function handleAuth(endpoint) {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    statusDiv.textContent = "⚠️ 請輸入帳號和密碼";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    console.log("🔎 Response:", data);

    if (!res.ok) {
      statusDiv.textContent = `❌ 錯誤：${data.error || data.message || "未知錯誤"}`;
      return;
    }

    if (endpoint === "login" && data.token) {
      // 儲存 JWT
      localStorage.setItem("jwt", data.token);
      statusDiv.textContent = "✅ 登入成功，跳轉中...";
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000);
    } else if (endpoint === "register") {
      statusDiv.textContent = "✅ 註冊成功，請用帳號密碼登入";
    }

  } catch (err) {
    console.error(err);
    statusDiv.textContent = "❌ 請求失敗，請稍後再試";
  }
}

loginBtn.addEventListener("click", () => handleAuth("login"));
registerBtn.addEventListener("click", () => handleAuth("register"));

