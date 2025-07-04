const urlParams = new URLSearchParams(window.location.search);
const selectedUser = urlParams.get("user_id") || "";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("customer-container");
  const loader = document.getElementById("loader");
  const userTitle = document.getElementById("user-title");
if (selectedUser && userTitle) {
  userTitle.textContent = `🛍️ منتجات الزبون: ${selectedUser}`;
}

  let isGlobalMuted = true;
  let currentPage = 1;
  const limit = 10;
  let loading = false;

  // ✅ المراقب لتشغيل فيديو واحد فقط
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target.querySelector("video");
      if (!video) return;

      if (entry.isIntersecting) {
        document.querySelectorAll("video").forEach(v => {
          if (v !== video) {
            v.pause();
            v.currentTime = 0;
          }
        });
        video.play().catch(err => {
          console.warn("⚠️ فشل تشغيل الفيديو:", err);
        });
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.75 });

  // ✅ زر كتم الصوت
  const muteBtn = document.createElement("button");
  muteBtn.textContent = "🔊";
  muteBtn.className = "mute-toggle-btn";
  Object.assign(muteBtn.style, {
    position: "fixed",
    bottom: "90px",
    right: "20px",
    zIndex: 999,
    background: "#000",
    color: "#fff",
    border: "none",
    padding: "10px 15px",
    borderRadius: "10px",
    fontSize: "20px"
  });

  muteBtn.onclick = () => {
    isGlobalMuted = !isGlobalMuted;
    document.querySelectorAll("video").forEach(v => v.muted = isGlobalMuted);
    muteBtn.textContent = isGlobalMuted ? "🔊" : "🔇";
  };

  document.body.appendChild(muteBtn);

  // ✅ دالة إنشاء كل منتج (فيديو أو صورة)
  function addVideoSlide(item) {
    const slide = document.createElement("div");
    slide.className = "tiktok-slide";
    slide.dataset.description = (item.name || "") + " - " + (item.description || "");
    slide.dataset.id = item.id;

    if (item.type === "video") {
      const video = document.createElement("video");
      video.setAttribute("poster", item.poster || "");
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      video.setAttribute("autoplay", "");
      video.setAttribute("preload", "auto");
      video.setAttribute("muted", "");
      video.muted = isGlobalMuted;
      video.loop = true;
      video.playsInline = true;
      video.style.width = "100%";
      video.style.maxHeight = "100vh";

      if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(item.url);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = item.url;
      } else {
        alert("❌ المتصفح لا يدعم HLS: " + item.url);
      }

      slide.appendChild(video);
    } else if (item.type === "image") {
      const img = document.createElement("img");
      img.src = item.url;
      img.alt = item.name || "صورة";
      img.style.width = "100%";
      img.style.maxHeight = "100vh";
      img.style.objectFit = "cover";
      slide.appendChild(img);
    }

    // ✅ الوصف
    const overlay = document.createElement("div");
    overlay.className = "video-overlay";
    overlay.textContent = (item.name || "") + " - " + (item.description || "");

    // ✅ أزرار الزبون
    const actions = document.createElement("div");
    actions.className = "owner-actions";
    actions.innerHTML = `
      <button onclick="copyPost('${item.id}')">🔁</button>
      <button onclick="sharePost('${item.id}')">📤</button>
      <button onclick="deletePost('${item.id}')">🗑️</button>
      <button onclick="pinPost('${item.id}')">📌</button>
      <button onclick="openComments('${item.id}')">💬</button>
      <button onclick="likePost('${item.id}')">❤️</button>
    `;

    slide.appendChild(overlay);
    slide.appendChild(actions);
    container.appendChild(slide);
    observer.observe(slide);
  }

  // ✅ تحميل الفيديوهات تدريجياً
  async function loadNextVideos() {
    if (loading) return;
    loading = true;
    try {
      loader.style.display = "flex";
      const res = await fetch(`/api/tiktok-products?page=${currentPage}&limit=${limit}`);
      const products = await res.json();
      if (!products.length) return;
      const filteredProducts = products.filter(p => p.user_id === selectedUser);
      filteredProducts.forEach(addVideoSlide);

      currentPage++;
    } catch (err) {
      alert("❌ فشل تحميل البيانات: " + err.message);
    } finally {
      loader.style.display = "none";
      loading = false;
    }
  }

  loadNextVideos();

  window.addEventListener("scroll", () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
      loadNextVideos();
    }
  });
});

// ✅ دوال تحكم المنتج
function copyPost(id) {
  const text = document.querySelector(`[data-id="${id}"] .video-overlay`).textContent;
  navigator.clipboard.writeText(text);
  alert("✅ تم نسخ الوصف");
}

function sharePost(id) {
  const link = location.href + `?highlight=${id}`;
  if (navigator.share) {
    navigator.share({ url: link });
  } else {
    prompt("📤 انسخ الرابط وشاركه:", link);
  }
}

function deletePost(id) {
  if (confirm("❌ هل تريد حذف هذا المنتج؟")) {
    fetch(`/delete-product/${id}`, { method: "DELETE" })
      .then(() => location.reload());
  }
}

function pinPost(id) {
  fetch(`/pin-product/${id}`, { method: "POST" })
    .then(() => alert("📌 تم التثبيت"));
}

function openComments(id) {
  window.location.href = `/comments.html?product_id=${id}`;
}

function likePost(id) {
  fetch(`/like-product/${id}`, { method: "POST" })
    .then(() => alert("❤️ أعجبتك"));
}
