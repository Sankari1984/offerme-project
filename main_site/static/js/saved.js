document.addEventListener("DOMContentLoaded", async () => {
  const userId = localStorage.getItem("user_id");
  const fullName = localStorage.getItem("full_name");

  if (!userId || !fullName) {
    alert("⚠️ يجب تسجيل الدخول أولاً.");
    window.location.href = "/viewer_login";
    return;
  }

  // 🚫 منع الزائر من استخدام صفحة المفضلة
  if (userId.startsWith("guest_")) {
    alert("🚫 المفضلة غير متاحة للزوار. يرجى تسجيل الدخول.");
    window.location.href = "/viewer_login";
    return;
  }

  const container = document.getElementById("tiktok-container");
  const isGlobalMuted = true;


  try {
    const [savedRes, productsRes] = await Promise.all([
      fetch("/data/savedProducts.json"),
      fetch("/data/products_data.json")
    ]);

    const savedData = await savedRes.json();
    const allProducts = await productsRes.json();
    const savedUrls = savedData[userId] || [];

    const savedProducts = allProducts.filter(p => savedUrls.includes(p.url));

    if (!savedProducts.length) {
      container.innerHTML = `<p style="text-align:center; color:white; font-size:18px; margin-top: 100px;">🚫 لا توجد منتجات محفوظة</p>`;
      return;
    }

    for (const item of savedProducts) {
      const slide = document.createElement("div");
      slide.className = "tiktok-slide";

      if (item.type === "video") {
        const video = document.createElement("video");
        video.setAttribute("playsinline", "");
        video.setAttribute("autoplay", "");
        video.setAttribute("muted", "");
        video.setAttribute("preload", "auto");
        video.loop = true;
        video.muted = isGlobalMuted;
        video.style.width = "100%";
        video.style.maxHeight = "100vh";

        if (typeof Hls !== 'undefined' && Hls.isSupported() && item.url.endsWith(".m3u8")) {
          const hls = new Hls();
          hls.loadSource(item.url);
          hls.attachMedia(video);
        } else {
          video.src = item.url;
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

      const overlay = document.createElement("div");
      overlay.className = "video-overlay";

      const title = document.createElement("div");
      title.className = "product-title";
      title.textContent = item.name || "";

      const desc = document.createElement("div");
      desc.className = "product-description";
      desc.textContent = item.description || "";

      overlay.appendChild(title);
      overlay.appendChild(desc);

      const saveBtn = document.createElement("button");
      saveBtn.textContent = "🗑️ إزالة من المفضلة";
      saveBtn.style = `
        margin-top: 10px;
        padding: 8px 12px;
        background: #d63031;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
      `;
      saveBtn.onclick = () => {
        fetch("/unsave-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, product_url: item.url })
        }).then(() => {
          slide.remove();
        });
      };

      overlay.appendChild(saveBtn);
      slide.appendChild(overlay);

      const actions = document.createElement("div");
      actions.className = "actions";

      let whatsapp = "";

      if (item.affiliate && item.affiliate.trim() !== "") {
        actions.innerHTML += `
          <button class="action-btn" onclick="window.open('${item.affiliate}', '_blank')" style="background: transparent; border: none; border-radius: 50%; width: 56px; height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; text-align: center;">
            <img src="/static/img/aliexpress.png" alt="AliExpress" style="width: 90%; height: 90%; object-fit: contain; display: block;">
            <span style="font-size: 10px; color: #f1f1f1; margin-top: 4px;">Ali</span>
          </button>
        `;
      } else {
        try {
          const res = await fetch(`/user-settings/${item.user_id}`);
          const settings = await res.json();
          whatsapp = settings.whatsapp || "";

          if (whatsapp.trim() !== "") {
            actions.innerHTML += `
              <button class="action-btn" onclick="window.open('https://wa.me/974${whatsapp}', '_blank')" style="background: transparent; border: none; border-radius: 50%; width: 56px; height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; text-align: center;">
                <img src="/static/img/whatsapp.png" alt="WhatsApp" style="width: 90%; height: 90%; object-fit: contain; display: block;">
                <span style="font-size: 10px; color: #f1f1f1; margin-top: 4px;">واتس</span>
              </button>
            `;
          }
        } catch (err) {
          console.warn("⚠️ فشل تحميل إعدادات المستخدم:", err);
        }
      }

      slide.appendChild(actions);
      container.appendChild(slide);
    }

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
          video.play().catch(err => console.warn("⚠️ لم يُشغل الفيديو:", err));
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.75 });

    document.querySelectorAll(".tiktok-slide").forEach(slide => observer.observe(slide));

  } catch (err) {
    console.error(err);
    container.innerHTML = `<p style="text-align:center; color:red; font-size:18px;">❌ فشل تحميل البيانات</p>`;
  }
});

document.getElementById("backButton").onclick = () => {
  window.location.href = "/tiktok";
};
