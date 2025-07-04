let userSettingsMap = {}; // ✅ تعريفه كمُعجم فاضي

document.addEventListener("DOMContentLoaded", () => {
  
  const fullName = localStorage.getItem("full_name") || "زائر";
const welcomeBanner = document.getElementById("welcomeBanner");
if (welcomeBanner) {
  welcomeBanner.textContent = `👋 مرحباً ${fullName}`;
}

const muteToggleBtn = document.createElement("button");
muteToggleBtn.id = "muteToggleBtn";
muteToggleBtn.textContent = "🔇 كتم";

Object.assign(muteToggleBtn.style, {
  position: "fixed",
  bottom: "80px", // 🟢 هذا سيضع الزر فوق الفوتر السفلي
  left: "20px",
  zIndex: "9999",
  background: "#000",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  padding: "8px 14px",
  fontSize: "14px",
  cursor: "pointer",
  boxShadow: "0 0 10px rgba(0,0,0,0.3)"
});

document.body.appendChild(muteToggleBtn);

muteToggleBtn.addEventListener("click", () => {
  userInteracted = true;
  isSoundActivated = !isSoundActivated;
  muteToggleBtn.textContent = isSoundActivated ? "🔊 صوت" : "🔇 كتم";
  unmuteVisibleVideo(); // يعيد تشغيل الفيديو الحالي مع الحالة الجديدة
});

document.addEventListener("click", function (e) {
  const btn = e.target.closest(".like-toggle");
  if (btn) {
    const span = btn.querySelector("span");
    const liked = span.dataset.liked === "true";

    span.textContent = liked ? "🤍" : "❤";
    span.style.color = liked ? "white" : "red";
    span.dataset.liked = liked ? "false" : "true";
  }
});
  const container = document.getElementById("tiktok-container");
  const loader = document.getElementById("loader");
  let isGlobalMuted = true;
  let userInteracted = false;

  let currentPage = 1;
  const limit = 10;
  let loading = false;
  let noMoreProducts = false;

let usersData = [];

function unmuteVisibleVideo() {
  if (currentVideo && userInteracted) {
    // أوقف كل الفيديوهات الأخرى
    document.querySelectorAll("video").forEach(v => {
      if (v !== currentVideo) {
        v.pause();
        v.currentTime = 0;
        v.muted = true; // نضمن كتمهم
      }
    });

    currentVideo.muted = !isSoundActivated;

    if (!currentVideo.paused) {
      currentVideo.play().catch(() => {});
    }
  }
}

let isSoundActivated = false;


fetch("/users")
  .then(res => res.json())
  .then(data => {
    usersData = data;
  });


 let currentVideo = null;

 const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const video = entry.target.querySelector("video");
    if (!video) return;

  if (entry.isIntersecting) {
  // ✅ أوقف باقي الفيديوهات
  document.querySelectorAll("video").forEach(v => {
    if (v !== video) {
      v.pause();
      v.currentTime = 0;
      v.muted = true;
    }
  });

  const isFirstVideo = !userInteracted && !isSoundActivated;
  currentVideo = video;
  video.muted = !isSoundActivated;

  // ✅ تشغيل الفيديو الحالي
  video.play().catch(err => {
    console.warn("⚠️ فشل تشغيل الفيديو:", err);
  });

  // ✅ إعادة المحاولة إذا لم يعمل
  setTimeout(() => {
    if (video.paused && userInteracted) {
      video.play().catch(() => {});
    }
  }, 800);

  // ✅ إذا انتهى آخر فيديو → ارجع لأول فيديو
  video.onended = () => {
    const allSlides = document.querySelectorAll(".tiktok-slide");
    const isLast = entry.target === allSlides[allSlides.length - 1];

    if (isLast && allSlides.length > 1) {
      const firstSlide = allSlides[0];
      const firstVideo = firstSlide.querySelector("video");

      if (firstSlide && firstVideo) {
        firstSlide.scrollIntoView({ behavior: "smooth" });

        setTimeout(() => {
          currentVideo = firstVideo;
          firstVideo.muted = !isSoundActivated;
          if (userInteracted) {
            firstVideo.play().catch(() => {});
          }
        }, 500);
      }
    }
  };


// ✅ أوقف جميع الفيديوهات الأخرى
document.querySelectorAll("video").forEach(v => {
  if (v !== video) {
    v.pause();
    v.currentTime = 0;
    v.muted = true;
  }
});

// ✅ شغّل الفيديو الحالي
// ✅ شغّل الفيديو الحالي
video.play().catch(err => {
  console.warn("⚠️ فشل تشغيل الفيديو:", err);
});

// ✅ أعد المحاولة إذا لم يعمل بعد 800ms
setTimeout(() => {
  if (video.paused && userInteracted) {
    video.play().catch(() => {});
  }
}, 800);

// ✅ إذا انتهى الفيديو وكان آخر واحد → ارجع لأول فيديو
video.onended = () => {
  const allSlides = document.querySelectorAll(".tiktok-slide");
  const isLast = entry.target === allSlides[allSlides.length - 1];

  if (isLast && allSlides.length > 1) {
    const firstSlide = allSlides[0];
    const firstVideo = firstSlide.querySelector("video");

    if (firstSlide && firstVideo) {
      firstSlide.scrollIntoView({ behavior: "smooth" });

      setTimeout(() => {
        currentVideo = firstVideo;
        firstVideo.muted = !isSoundActivated;
        if (userInteracted) {
          firstVideo.play().catch(() => {});
        }
      }, 500);
    }
  }
};





      // ✅ أضف الكلاس للسلايد الظاهر
      entry.target.classList.add("active");

      // ✅ زر الشراء / الواتساب حسب الحالة
      const currentSlide = entry.target;
      const userId = currentSlide.dataset.userId;
      const affiliate = currentSlide.dataset.affiliate;
      const settings = userSettingsMap[userId] || {};
      const plusBtn = document.getElementById("plusButton");

      if (plusBtn) {
        plusBtn.onclick = () => {
          if (affiliate && affiliate.trim() !== "") {
            window.open(affiliate, "_blank");
          } else if (settings.whatsapp && settings.whatsapp.trim() !== "") {
            const phone = settings.whatsapp.replace(/\D/g, "");
            window.open("https://wa.me/" + phone, "_blank");
          } else {
            alert("❌ لا يوجد رابط متاح لهذا المنتج.");
          }
        };
      }

    } else {
      // ✅ أزل الكلاس عند الخروج من الرؤية
      entry.target.classList.remove("active");
      // ✅ إزالة الإشعار إذا خرج الفيديو من الرؤية
      const existingHint = document.getElementById("soundHint");
      if (existingHint) existingHint.remove();

      // ✅ أوقف الفيديو
      document.querySelectorAll("video").forEach(v => v.pause());
    }
  });
}, { threshold: 0.75 });



 


 function addVideoSlide(item) {
  const slide = document.createElement("div");
  slide.className = "tiktok-slide";
  slide.dataset.description = (item.name || "") + " - " + (item.description || "");
  slide.dataset.userId = item.user_id || "";
  slide.dataset.url = item.url || "";
  slide.dataset.affiliate = item.affiliate || "";


  // ✅ الباقي كما هو:
if (item.type === "video") {
  const video = document.createElement("video");
  video.setAttribute("poster", item.poster || "");
  video.setAttribute("playsinline", "");
  video.setAttribute("preload", "auto");

  video.muted = isGlobalMuted;
  video.autoplay = isGlobalMuted;
  video.loop = true;

  video.className = "main-media";
  video.style.width = "100vw";
  video.style.height = "100vh";
  video.style.objectFit = "contain";
  video.style.backgroundColor = "black";

  video.onloadedmetadata = () => {
    if (video.videoHeight / video.videoWidth <= 1.1) {
      video.classList.add("shift-up");
    }
  };

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
  // ✅ إزالة إشعار الصوت إن وُجد
  const existingHint = document.getElementById("soundHint");
  if (existingHint) existingHint.remove();

  const img = document.createElement("img");
  img.src = item.url;
  img.alt = item.name || "صورة";
  img.className = "main-media";
  img.style.width = "100vw";
  img.style.height = "100vh";
  img.style.objectFit = "contain";
  img.style.backgroundColor = "black";

  const tempImg = new Image();
  tempImg.onload = () => {
    if (tempImg.height / tempImg.width <= 1.1) {
      img.classList.add("shift-up");
    }
  };
  tempImg.src = item.url;

  slide.appendChild(img);
container.appendChild(slide);
observer.observe(slide);

}

  

// ✅ تحديث زر الفوتير عند ظهور فيديو جديد
const plusBtn = document.getElementById("plusButton");
if (plusBtn) {
  plusBtn.onclick = () => {
    const userId = entry.target.dataset.userId;
    const itemUrl = entry.target.dataset.url;
    const affiliate = entry.target.dataset.affiliate;
    const settings = userSettingsMap[userId] || {};

    if (affiliate && affiliate.trim() !== "") {
      window.open(affiliate, "_blank");
    } else if (settings.whatsapp && settings.whatsapp.trim() !== "") {
      const phone = settings.whatsapp.replace(/\D/g, "");
      window.open("https://wa.me/" + phone, "_blank");
    } else {
      alert("❌ لا يوجد رابط متاح لهذا المنتج.");
    }
  };
}


const user = usersData.find(u => u.user_id === item.user_id);
const fullName = user?.full_name || "";




// ✅ غلاف النص
const overlay = document.createElement("div");
overlay.className = "video-overlay";

// ✅ اسم الزبون
const fullNameDiv = document.createElement("div");
fullNameDiv.className = "product-fullname";
fullNameDiv.textContent = fullName;

// ✅ اسم المنتج
const productTitle = document.createElement("div");
productTitle.className = "product-title";
productTitle.textContent = item.name || "";

// ✅ وصف المنتج
const productDesc = document.createElement("div");
productDesc.className = "product-description";
productDesc.style.display = "-webkit-box";
productDesc.style.webkitBoxOrient = "vertical";
productDesc.style.webkitLineClamp = "1";
productDesc.style.overflow = "hidden";
productDesc.style.textOverflow = "ellipsis";
productDesc.textContent = item.description || "";

// ✅ زر "شراء الآن"
let buyBtn = null;
if (item.affiliate) {
  buyBtn = document.createElement("a");
  buyBtn.href = item.affiliate;
  buyBtn.target = "_blank";
  buyBtn.className = "buy-now-btn";
  buyBtn.textContent = "🛒 شراء الآن";
  buyBtn.style.display = "none"; // مخفي بالبداية
}

// ✅ ترتيب العناصر داخل overlay
overlay.appendChild(fullNameDiv);
overlay.appendChild(productTitle);
overlay.appendChild(productDesc);
if (buyBtn) overlay.appendChild(buyBtn);

// ✅ أضف overlay إلى السلايد
slide.appendChild(overlay);

// ✅ زر "عرض المزيد"
const toggleBtn = document.createElement("button");
toggleBtn.className = "expand-btn";
toggleBtn.textContent = "عرض المزيد";
toggleBtn.style.display = "none";
slide.appendChild(toggleBtn);

// ✅ سلوك زر "عرض المزيد"
toggleBtn.onclick = () => {
  const isClamped = productDesc.style.webkitLineClamp === "1";

  if (isClamped) {
    productDesc.style.webkitLineClamp = "unset";
    productDesc.style.maxHeight = "none";
    productDesc.style.overflow = "visible";
    toggleBtn.textContent = "عرض أقل";
    if (buyBtn) buyBtn.style.display = "inline-block";
  } else {
    productDesc.style.webkitLineClamp = "1";
    productDesc.style.maxHeight = "1.5em";
    productDesc.style.overflow = "hidden";
    toggleBtn.textContent = "عرض المزيد";
    if (buyBtn) buyBtn.style.display = "none";
  }
};

// ✅ بعد تحميل العنصر، تحقق من عدد الأسطر
requestAnimationFrame(() => {
  const computedStyle = window.getComputedStyle(productDesc);
  const lineHeight = parseFloat(computedStyle.lineHeight);
  const height = productDesc.scrollHeight;
  const numberOfLines = height / lineHeight;

  if (numberOfLines > 1.2) {
    toggleBtn.style.display = "block";
  }
});





// أزرار التفاعل
const actions = document.createElement("div");
actions.className = "actions";

// ✅ كتلة اللايك مع اللوغو
if (item.logo) {
  actions.innerHTML += `
    <div style="
      width: 56px;
      height: 56px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
    ">
      <img src="${item.logo}" alt="شعار" style="
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      ">
    </div>
  `;
}


actions.innerHTML += `
  <button class="action-btn like-toggle" style="
    background: transparent;
    border: none;
    border-radius: 50%;
    width: 56px;
    height: 56px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    overflow: hidden;
    text-align: center;
  ">
    <span data-liked="false" style="font-size: 34px; color: white;">🤍</span>
    <span style="font-size: 10px; color: #f1f1f1; margin-top: 4px;"></span>
  </button>
`;



fetch(`/user-settings/${item.user_id}`)
  .then(res => res.ok ? res.json() : null)
  .then(settings => {
    const whatsapp = settings && settings.whatsapp ? settings.whatsapp.trim() : "";

    const isSaved = (localStorage.savedProducts || "").includes(item.url);
    const saveIcon = isSaved ? "saved.png" : "save.png";


 actions.innerHTML += 

 `
  <!--  زر التعليقات -->
<button class="action-btn" id="comment-btn-${item.id}"
   onclick="viewCommentsPopup('${item.id}')"

    style="background: transparent; border: none; border-radius: 50%; width: 56px; height: 56px; 
           display: flex; flex-direction: column; align-items: center; justify-content: center; 
           cursor: pointer; overflow: hidden; text-align: center;">
    
    <img src="/static/img/comment.png" alt="💬" 
         style="width: 70%; height: 70%; object-fit: contain; display: block; margin-bottom: 4px;">
    
   <span id="comment-count-${item.id}" class="comment-count" style="font-size: 13px; color: #fff; font-weight: bold;">0</span>


  </button>

        <!-- 🔗 زر المشاركة -->
        <button class="action-btn" onclick="navigator.share ? navigator.share({ url: '${item.url}' }) : alert('انسخ الرابط: ${item.url}')" style="background: transparent; border: none; border-radius: 50%; width: 56px; height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; text-align: center;">
          <img src="/static/img/share.png" alt="مشاركة" style="width: 90%; height: 90%; object-fit: contain; display: block;">
          <span style="font-size: 10px; color: #f1f1f1; margin-top: 4px;"></span>
        </button>

     <!-- 🏪 زر المتجر -->
<button class="action-btn" onclick="window.location.href='store.html?user_id=${encodeURIComponent(item.user_id)}&visitor=true'" style="background: transparent; border: none; border-radius: 50%; width: 56px; height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; text-align: center;">
  <img src="/static/img/store.png" alt="المتجر" style="width: 90%; height: 90%; object-fit: contain; display: block;">
  <span style="font-size: 10px; color: #f1f1f1; margin-top: 4px;"></span>
</button>


<!-- 💾 زر الحفظ -->
<button class="action-btn" onclick="toggleSave(this, '${item.url}')" style="
    background: transparent;
    border: none;
    border-radius: 50%;
    width: 56px;
    height: 56px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    overflow: hidden;
    text-align: center;
  ">
    <img src="/static/img/${saveIcon}" alt="حفظ" style="width: 90%; height: 90%; object-fit: contain; display: block;">
    <span style="font-size: 10px; color: #f1f1f1; margin-top: 4px;"></span>
  </button>

      <!-- ✅ AliExpress أو WhatsApp -->
      ${
        item.affiliate && item.affiliate.trim() !== ""
          ? `<button class="action-btn" onclick="window.open('${item.affiliate}', '_blank')" style="background: transparent; border: none; border-radius: 50%; width: 56px; height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; text-align: center;">
              <img src="/static/img/aliexpress.png" alt="AliExpress" style="width: 90%; height: 90%; object-fit: contain; display: block;">
              <span style="font-size: 10px; color: #f1f1f1; margin-top: 4px;"></span>
            </button>`
          : (whatsapp !== ""
              ? `
            <!-- 🟢 زر واتساب -->
            <button class="action-btn" onclick="window.open('https://wa.me/974${whatsapp}', '_blank')" style="
            background: transparent;
            border: none;
            border-radius: 50%;
            width: 56px;
            height: 56px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            overflow: hidden;
            text-align: center;
          ">
           <img src="/static/img/whatsapp.png" alt="WhatsApp" style="width: 90%; height: 90%; object-fit: contain; display: block;">
           <span style="font-size: 10px; color: #f1f1f1; margin-top: 4px;"></span>
          </button>   
                `
              : "")
             }
            `;


// ✅ تحميل عدد التعليقات من السيرفر (المسار الصحيح)
fetch(`/get_comment_count/${item.id}`)
  .then(res => res.ok ? res.json() : { count: 0 })
  .then(data => {
    const counterEl = document.getElementById(`comment-count-${item.id}`);
    if (counterEl) {
      counterEl.textContent = data.count || "0";
    }
  })
  .catch(err => console.warn("❌ فشل تحميل عدد التعليقات:", err));



    // ✅ بعد بناء الأزرار، أضفها داخل السلايد
    slide.appendChild(actions);

// ✅ تحقق مما إذا تم تحديث العداد من صفحة التعليقات
const updatedCount = localStorage.getItem(`comment-count-update-${item.id}`);
if (updatedCount) {
  const counterEl = document.getElementById(`comment-count-${item.id}`);
  if (counterEl) counterEl.textContent = updatedCount;
  localStorage.removeItem(`comment-count-update-${item.id}`);
}

  })
  .catch(err => {
    console.warn("⚠️ فشل تحميل إعدادات الزبون:", err);
  });


// ✅ جعل نص الأزرار بولد فورًا بعد إنشائها
actions.querySelectorAll("span").forEach(span => {
  // ✅ تجاهل القلب داخل زر اللايك
  if (span.textContent !== "♡" && span.textContent !== "❤") {
    span.style.fontWeight = "900";
    span.style.fontSize = "15px";
  }
});



    slide.appendChild(overlay);
    

    
    container.appendChild(slide);
    observer.observe(slide);


  }

  async function loadNextVideos() {
    if (loading || noMoreProducts) return;
    loading = true;
    try {
      loader.style.display = "block";
      const res = await fetch(`/api/tiktok-products?page=${currentPage}&limit=${limit}`);
      const products = await res.json();

      if (!products.length) {
        noMoreProducts = true;
        return;
      }

      products.forEach(addVideoSlide);
      currentPage++;
      observeForPreload();
    } catch (err) {
      alert("❌ فشل تحميل البيانات: " + err.message);
    } finally {
      loader.style.display = "none";
      loading = false;
    }
  }

  function observeForPreload() {
    const slides = container.querySelectorAll(".tiktok-slide");
    const preloadTarget = slides[slides.length - 3];
    if (preloadTarget) {
      const preloadObserver = new IntersectionObserver((entries, obs) => {
        if (entries[0].isIntersecting) {
          obs.unobserve(preloadTarget);
          loadNextVideos();
        }
      }, { threshold: 0.5 });
      preloadObserver.observe(preloadTarget);
    }
  }

  const searchBtn = document.getElementById("searchByBusinessTypeBtn");
  if (searchBtn) {
    searchBtn.addEventListener("click", async () => {
  try {
    const res = await fetch(`/users`);
    const users = await res.json();
    const uniqueTypes = [...new Set(users.map(u => u.business_type).filter(Boolean))];

    const modal = document.createElement("div");
    Object.assign(modal.style, {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0, 0, 0, 0.85)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
    });

    const content = document.createElement("div");
    Object.assign(content.style, {
      background: "#fff",
      borderRadius: "16px",
      maxWidth: "600px",
      width: "90%",
      maxHeight: "80vh",
      overflowY: "auto",
      padding: "20px",
      boxShadow: "0 0 20px rgba(0,0,0,0.4)",
    });

    const title = document.createElement("h2");
    title.textContent = "🔍 اختر نوع النشاط التجاري";
    Object.assign(title.style, {
      textAlign: "center",
      color: "#333",
      fontSize: "22px",
      marginBottom: "20px"
    });

    const grid = document.createElement("div");
    Object.assign(grid.style, {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
      gap: "12px",
    });

    uniqueTypes.forEach(type => {
      const btn = document.createElement("button");
      btn.textContent = type;
      Object.assign(btn.style, {
        padding: "10px",
        background: "#00aaff",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "14px",
        transition: "0.3s",
        whiteSpace: "nowrap"
      });
      btn.onmouseenter = () => btn.style.background = "#008fcc";
      btn.onmouseleave = () => btn.style.background = "#00aaff";
      btn.onclick = async () => {
        modal.remove();

        const videosRes = await fetch(`/api/tiktok-products`);
        const products = await videosRes.json();

        const userIds = users.filter(u => u.business_type === type).map(u => u.user_id);
        const filtered = products.filter(p => userIds.includes(p.user_id));

        container.innerHTML = "";
        filtered.forEach(addVideoSlide);

        if (filtered.length === 0) {
          container.innerHTML = `<p style="color:white; text-align:center; margin-top:50px;">🚫 لا توجد منتجات لهذا النشاط</p>`;
        }
      };
      grid.appendChild(btn);
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "❌ إغلاق";
    Object.assign(cancelBtn.style, {
      marginTop: "20px",
      width: "100%",
      padding: "10px",
      background: "#444",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "16px",
    });
    cancelBtn.onclick = () => modal.remove();

    content.appendChild(title);
    content.appendChild(grid);
    content.appendChild(cancelBtn);
    modal.appendChild(content);
    document.body.appendChild(modal);
  } catch (err) {
    alert("❌ خطأ أثناء البحث:\n" + err.message);
  }
});

  }

  loadNextVideos();

// ✅ تشغيل أول فيديو تلقائياً بصمت بعد تحميل أول دفعة
setTimeout(() => {
  const firstSlide = document.querySelector(".tiktok-slide");
  if (firstSlide) {
    const firstVideo = firstSlide.querySelector("video");
    if (firstVideo) {
      currentVideo = firstVideo;
      firstVideo.muted = true;
      firstVideo.play().catch(err => {
        console.warn("⚠️ فشل تشغيل أول فيديو:", err);
      });
    }
  }
}, 1200);

// ✅ مراقبة آخر فيديو إذا المستخدم نزل لتحت وبقي عليه
const scrollObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const allSlides = document.querySelectorAll(".tiktok-slide");
      const lastSlide = allSlides[allSlides.length - 1];
      if (entry.target === lastSlide) {
        // ✅ مرر المستخدم لآخر فيديو → ارجع لأول فيديو بعد ثانيتين
        setTimeout(() => {
          const firstSlide = document.querySelector(".tiktok-slide");
          const firstVideo = firstSlide?.querySelector("video");
          if (firstSlide && firstVideo) {
            firstSlide.scrollIntoView({ behavior: "smooth" });
            setTimeout(() => {
              currentVideo = firstVideo;
              firstVideo.muted = !isSoundActivated;
              if (userInteracted) {
                firstVideo.play().catch(() => {});
              }
            }, 500);
          }
        }, 2000);
      }
    }
  });
}, { threshold: 0.9 });

// ✅ راقب آخر سلايد بعد كل تحميل
setInterval(() => {
  const slides = document.querySelectorAll(".tiktok-slide");
  if (slides.length) {
    const last = slides[slides.length - 1];
    scrollObserver.observe(last);
  }
}, 3000);



});





function toggleSave(button, productUrl) {
  let saved = JSON.parse(localStorage.getItem("savedProducts") || "[]");
  const img = button.querySelector("img");
  const index = saved.indexOf(productUrl);
  const userId = localStorage.getItem("user_id");

  if (!userId) {
    alert("⚠️ يجب تسجيل الدخول لحفظ المنتج.");
    return;
  }

  if (index === -1) {
    saved.push(productUrl);
    img.src = "static/img/saved.png";

    // ✅ إرسال للسيرفر
    fetch("/save-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, product_url: productUrl })
    });
  } else {
    saved.splice(index, 1);
    img.src = "static/img/save.png";

    // ✅ إزالة من السيرفر
    fetch("/unsave-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, product_url: productUrl })
    });
  }

  localStorage.setItem("savedProducts", JSON.stringify(saved));
}








function openComments(productId) {
  window.open(`/product_comments_sheet.html?product_id=${productId}`, "_blank");
}





function viewCommentsPopup(productId) {
  window.location.href = `/product_comments_sheet?product_id=${productId}`;

  const key = `comment-count-update-${productId}`;
  const interval = setInterval(() => {
    const updated = localStorage.getItem(key);
    if (updated) {
      const span = document.getElementById(`comment-count-${productId}`);
      if (span) span.textContent = updated;
      localStorage.removeItem(key);
      clearInterval(interval);
    }
  }, 500);
}

function unmuteVisibleVideo() {
  const visibleVideos = document.querySelectorAll("video");
  visibleVideos.forEach((video, index) => {
    if (index === 0) {
      video.muted = !isSoundActivated;
      video.volume = isSoundActivated ? 1.0 : 0.0;
    } else {
      video.muted = true;
    }
  });
}

