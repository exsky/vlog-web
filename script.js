const API_BASE = "https://iwlw3i3ys4.execute-api.ap-northeast-1.amazonaws.com/prod";

const form = document.getElementById("uploadForm");
const fileInput = document.getElementById("fileInput");
const statusDiv = document.getElementById("status");
const progressBar = document.getElementById("progressBar");
const logoutBtn = document.getElementById("logoutBtn");
const welcomeUser = document.getElementById("welcomeUser");

// 🚀 頁面載入時，先驗證 JWT
document.addEventListener("DOMContentLoaded", async () => {
  const token = await validateToken();
  if (!token) return;

  console.log("✅ JWT 驗證成功，顯示上傳功能");

  // 顯示 UI
  document.getElementById("uploadSection").style.display = "block";
  logoutBtn.style.display = "inline-block";

  // 綁定登出事件
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("jwt");
    alert("已登出！");
    window.location.href = "login.html";
  });

  // 取得使用者名稱並顯示
  try {
    const res = await fetch(`${API_BASE}/validate`, {
      method: "GET",
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await res.json();
    if (data.username) {
      welcomeUser.textContent = `👋 Hi, ${data.username}`;
    }
  } catch (err) {
    console.error("❌ 無法取得使用者名稱:", err);
  }
});

// ✅ 驗證 JWT 是否有效
async function validateToken() {
  const token = localStorage.getItem("jwt");
  if (!token) {
    window.location.href = "login.html";
    return null;
  }

  try {
    const res = await fetch(`${API_BASE}/validate`, {
      method: "GET",
      headers: { "Authorization": "Bearer " + token }
    });

    if (res.status === 401) {
      localStorage.removeItem("jwt");
      window.location.href = "login.html";
      return null;
    }
    return token;
  } catch (err) {
    console.error("❌ 驗證 API 錯誤:", err);
    return null;
  }
}

// ✅ 上傳影片
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const file = fileInput.files[0];
  if (!file) {
    statusDiv.textContent = "⚠️ 請先選擇影片！";
    return;
  }

  const token = await validateToken();
  if (!token) return;

  statusDiv.textContent = "正在請求上傳網址...";
  progressBar.value = 0;

  try {
    const res = await fetch(`${API_BASE}/generate-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type    // ✅ 傳給 Lambda
      })
    });

    const data = await res.json();
    if (!res.ok || !data.url) {
      statusDiv.textContent = "❌ 無法取得上傳 URL";
      return;
    }

    const uploadUrl = data.url;
    statusDiv.textContent = "正在上傳影片...";

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        progressBar.value = percent;
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        statusDiv.textContent = "✅ 上傳完成！";
        loadVideos();  // ⬅️ 上傳完成後刷新影片清單
      } else {
        statusDiv.textContent = `❌ 上傳失敗：${xhr.statusText}`;
      }
    };

    xhr.onerror = () => {
      statusDiv.textContent = "❌ 上傳錯誤，請稍後再試";
    };

    xhr.send(file);

  } catch (err) {
    console.error("❌ 上傳流程錯誤:", err);
    statusDiv.textContent = "❌ 上傳失敗";
  }
});

//　✅ 載入並顯示影片清單
async function loadVideos() {
  const token = localStorage.getItem("jwt");
  if (!token) {
    alert("請先登入！");
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/list-videos`, {
      method: "GET",
      headers: { "Authorization": "Bearer " + token }
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("❌ list-videos 錯誤:", data);
      return;
    }

    const videoListDiv = document.getElementById("videoList");
    videoListDiv.innerHTML = ""; // 清空舊內容
    data.forEach(item => {
      // 外層卡片
      const card = document.createElement("div");
      card.className = "video-card";

      // 縮圖
      if (item.cover_url) {
        const img = document.createElement("img");
        img.src = item.cover_url;
        img.alt = item.decodedName;
        card.appendChild(img);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "placeholder";
        placeholder.textContent = "🎬 無縮圖";
        card.appendChild(placeholder);
      }

      // 檔名連結
      const link = document.createElement("a");
      link.href = item.video_url;
      link.target = "_blank";
      link.textContent = item.decodedName;
      card.appendChild(link);

      // 檔案大小
      const sizeInfo = document.createElement("div");
      sizeInfo.className = "size";
      sizeInfo.textContent = `${(item.size / 1024 / 1024).toFixed(2)} MB`;
      card.appendChild(sizeInfo);

      // ❌ 刪除按鈕
      const delBtn = document.createElement("button");
      delBtn.textContent = "刪除";
      delBtn.style.marginTop = "8px";
      delBtn.onclick = async () => {
        if (!confirm(`確定刪除 ${item.decodedName}？`)) return;

        const token = localStorage.getItem("jwt");
        try {
          const res = await fetch(`${API_BASE}/delete-video`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ key: item.key })
          });
          const result = await res.json();

          if (res.ok) {
            alert("✅ 已刪除");
            loadVideos(); // ⬅️ 刪除後刷新清單
          } else {
            alert("❌ 刪除失敗：" + (result.error || "未知錯誤"));
          }
        } catch (err) {
          console.error("刪除失敗:", err);
        }
      };
      card.appendChild(delBtn);

      videoListDiv.appendChild(card);
    });
  } catch (err) {
    console.error("❌ 載入影片失敗:", err);
  }
}

// 縮圖
const thumbWrapper = document.createElement("div");
thumbWrapper.className = "thumb-wrapper";

if (item.cover_url) {
  const img = document.createElement("img");
  img.src = item.cover_url;
  img.alt = item.decodedName;
  thumbWrapper.appendChild(img);
} else {
  const placeholder = document.createElement("div");
  placeholder.className = "placeholder";
  placeholder.textContent = "🎬 無縮圖";
  thumbWrapper.appendChild(placeholder);
}

// ▶️ 播放 Icon
const playIcon = document.createElement("div");
playIcon.className = "play-icon";
playIcon.textContent = "▶️";
thumbWrapper.appendChild(playIcon);

card.appendChild(thumbWrapper);