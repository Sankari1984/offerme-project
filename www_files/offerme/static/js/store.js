const urlParams = new URLSearchParams(window.location.search);
const userIdParam = (urlParams.get("user_id") || "").trim().toLowerCase();
let localUserId = (localStorage.getItem("user_id") || "").trim().toLowerCase();

// ✅ إذا الرابط فيه user_id مثل admin أو غيره → احفظه بدل guest
if (userIdParam && (!localUserId || localUserId.startsWith("guest_"))) {
  localUserId = userIdParam;
  localStorage.setItem("user_id", localUserId);
}

// ✅ إذا ما زال ما في user_id محفوظ → أنشئ كزائر
if (!localUserId) {
  localUserId = "guest_" + Date.now();
  localStorage.setItem("user_id", localUserId);
}

const currentUser = localUserId;
const visitingUser = userIdParam;
const isVisitor = urlParams.get("visitor") === "true";
const BASE_URL = window.location.origin;
let userId = visitingUser || localUserId;

// ✅ إذا بعد كل شيء ما في userId صالح → رجع لتسجيل الدخول
if (!userId || userId.startsWith("guest_")) {
  alert("⚠️ يرجى تسجيل الدخول أولاً");
  window.location.href = "login.html";
}

// ✅ احذف full_name فقط إذا المستخدم ليس admin
if (userId !== "admin") {
  localStorage.removeItem("full_name");
}

const fromAllProducts = document.referrer.includes("all_products");
let currentProductId = null;



document.addEventListener("DOMContentLoaded", () => {
  if (isVisitor) {
    const elementsToHide = [
      "#uploadBtn",
      "#changeLogoBtn",
      "#editStoreBtn",
      "#tabsBtn",
      "#pinBtn",
      "#statsBox",
      "#settingsBtn",
      ".bottom-nav",
      ".store-actions",
      '[onclick="goToUpload()"]',
      '[onclick="goToManageTabs()"]',
      '.logout-btn'
    ];
    elementsToHide.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) el.style.display = "none";
    });
  }

  console.log("✅ user_id:", localStorage.getItem("user_id"));
});


  

  console.log("✅ userId:", userId);

  updateContent(); // للترجمة

  if (!isVisitor) {
    updateCommentBadge();
    setInterval(updateCommentBadge, 60000); // كل 60 ثانية
  }

  // ✅ منع الشاشة من الطلوع وقت كتابة الطلب
  const textarea = document.getElementById('serviceDescription');
  if (textarea) {
    textarea.addEventListener('focus', () => {
      window.scrollTo(0, 0);
    });
  }


// ✅ تهيئة i18next قبل أي شيء
i18next
  .use(i18nextHttpBackend)
  .init({
    lng: localStorage.getItem("lang") || "ar",
    backend: {
      loadPath: '/static/locales/{{lng}}/translation.json'
    }
  }, function(err, t) {
    document.dispatchEvent(new Event("i18nReady")); // إشارة بأن الترجمة جاهزة
  });

// ✅ جميع الوظائف التالية تبقى بدون تغيير

function copyPost(text) {
  const tempInput = document.createElement('textarea');
  tempInput.value = text;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand('copy');
  document.body.removeChild(tempInput);
  alert(i18next.t("copy_success"));
}

function shareFacebook(text) {
  const url = `https://www.facebook.com/sharer/sharer.php?u=&quote=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

function shareInstagram(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert(i18next.t("paste_instruction"));
  });
}

function goToUpload() {
  window.location.href = "https://offermeqa.com/offerme.html";
}

function goToManageTabs() {
  window.location.href = 'manage_tabs.html';
}

function openPopup(imageSrc) {
  const popup = document.createElement('div');
  popup.style.position = 'fixed';
  popup.style.top = '0';
  popup.style.left = '0';
  popup.style.width = '100%';
  popup.style.height = '100%';
  popup.style.background = 'rgba(0,0,0,0.7)';
  popup.style.display = 'flex';
  popup.style.justifyContent = 'center';
  popup.style.alignItems = 'center';
  popup.style.zIndex = '10000';
  popup.innerHTML = `<img src="${imageSrc}" style="max-width: 90%; max-height: 90%; border-radius: 10px;">`;
  popup.onclick = () => popup.remove();
  document.body.appendChild(popup);
}

async function deleteProduct(productId) {
  if (!confirm(i18next.t("delete_confirm"))) return;

  try {
    const res = await fetch(`${BASE_URL}/delete-product/${productId}`, { method: 'DELETE' });
    const result = await res.json();

    if (result.status === 'success') {
      alert(i18next.t("delete_success"));

      // ✅ إزالة البطاقة من الصفحة بدون إعادة تحميل
      const productCard = document.querySelector(`[data-product-id="${productId}"]`);
      if (productCard) productCard.remove();
    } else {
      alert(i18next.t("delete_error"));
    }
  } catch (error) {
    alert(i18next.t("delete_error"));
    console.error(error);
  }
}


// ✅ Firebase Push Notifications
async function importFirebaseMessaging(userId) {
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
  const { getMessaging, getToken, onMessage } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js");

  const firebaseConfig = {
    apiKey: "AIzaSyDnmeJiICl_j7UJ0d1xfKsA7KmizVe_QxA",
    authDomain: "offer-me-c0c4b.firebaseapp.com",
    projectId: "offer-me-c0c4b",
    storageBucket: "offer-me-c0c4b.firebasestorage.app",
    messagingSenderId: "413164622012",
    appId: "1:413164622012:web:91cd8b7c24e9a0353100b9",
    measurementId: "G-N37ZR1W8GD"
  };

  const app = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  // ✅ تسجيل service worker الصحيح
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  getToken(messaging, {
    vapidKey: 'BHsTG0e2m4UdrvrUuVKuHGwpbVya0g4F5NtF1EE8vnykR889YDHVLRu2z0t9gohDEkCj4UeDrfEUW7RBFpi4Nb8',
    serviceWorkerRegistration: registration  // ✅ هذا السطر هو المهم
  })
  

  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      getToken(messaging, {
        vapidKey: 'BHsTG0e2m4UdrvrUuVKuHGwpbVya0g4F5NtF1EE8vnykR889YDHVLRu2z0t9gohDEkCj4UeDrfEUW7RBFpi4Nb8',
        serviceWorkerRegistration: registration
      }).then(currentToken => {
        if (currentToken) {
          fetch(`${BASE_URL}/save-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              token: currentToken
            })
          });
        } else {
          console.warn('⚠️ لم يتم الحصول على التوكن');
        }
      }).catch(err => {
        console.error('❌ فشل getToken():', err);
      });
    } else {
      console.warn("🚫 المستخدم رفض الإذن");
    }
  });

  onMessage(messaging, (payload) => {
    alert(payload.notification.title + "\n" + payload.notification.body);
  });
}
function loadComments(productId) {
  fetch(`${BASE_URL}/comments/${productId}`)
    .then(res => res.json())
    .then(comments => {
      const container = document.getElementById(`comments-${productId}`);
      if (!container) return;
      if (!comments.length) {
        container.innerHTML = "<p>لا يوجد تعليقات.</p>";
      } else {
        container.innerHTML = comments.map(c => `<p style="background:#f9f9f9;padding:6px;border-radius:6px;margin-bottom:6px;">💬 ${c}</p>`).join("");
      }
    });
}

function loadStoreInfo() {
  const storeTitle = document.getElementById('storeOwnerDisplay');
  const logoImg = document.getElementById('storeLogo');
 
  // ✅ إزالة الاسم القديم من التخزين المؤقت
  localStorage.removeItem("full_name");

  if (!userId) return;

  fetch(`${BASE_URL}/user-settings/${userId}`)
    .then(res => res.json())
    .then(data => {
      if (data.full_name) {
        storeTitle.textContent = data.full_name;
        localStorage.setItem("full_name", data.full_name);
      } else {
        storeTitle.textContent = "";  // ✅ لا تعرض userId إطلاقًا
      }

      if (data.logo) {
        logoImg.src = `${BASE_URL}${data.logo}?t=${Date.now()}`;
        logoImg.style.display = 'inline-block';
      }
    })
    .catch(err => {
      console.error("❌ فشل تحميل إعدادات المستخدم:", err);
      storeTitle.textContent = ""; // ✅ لا تعرض userId حتى في حال الخطأ
    });
}





function logout() {
  localStorage.clear();
  window.location.href = 'login.html';
}

function goToUpload() {
  window.location.href = 'https://offermeqa.com/offerme.html';
}

function goToManageTabs() { window.location.href = 'manage_tabs.html'; }
function expandPost(id, link) {
  const postDiv = document.getElementById('post-' + id);
  postDiv.classList.toggle('expanded');
  const key = postDiv.classList.contains('expanded') ? "see_less" : "see_more";
  link.textContent = i18next.t(key);
}
function goBackToProducts() {
  if (document.referrer.includes("all_products")) {
    window.history.back();
  } else {
    window.location.href = "all_products";
  }
}

function openMediaModal(mediaUrl, isVideo) {
  const modal = document.getElementById('mediaModal');
  const content = document.getElementById('mediaContent');

  content.innerHTML = ''; // إفراغ المودال قبل كل عرض جديد
  

  if (isVideo) {
    const video = document.createElement('video');
    video.setAttribute('autoplay', '');
    video.setAttribute('controls', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', ''); // كتم لتجنب الحظر
    video.style.maxWidth = '80vw';
    video.style.maxHeight = '60vh';
    video.style.borderRadius = '10px';
    video.id = 'modalVideo';

    content.appendChild(video);

    if (Hls.isSupported() && mediaUrl.endsWith('.m3u8')) {
      const hls = new Hls();
      hls.loadSource(mediaUrl);
      hls.attachMedia(video);
    } else {
      video.src = mediaUrl;
    }

  } else {
    const img = document.createElement('img');
    img.src = mediaUrl;
    img.style.maxWidth = '80vw';
    img.style.maxHeight = '60vh';
    img.style.borderRadius = '10px';
    content.appendChild(img);
  }

  modal.style.display = 'flex';
}

function closeMediaModal() {
  document.getElementById('mediaModal').style.display = 'none';
  document.getElementById('mediaContent').innerHTML = '';
}


document.addEventListener("DOMContentLoaded", async () => {
  const lastSeen = parseInt(localStorage.getItem("products_last_update") || "0");

  try {
    const res = await fetch("/api/last-products-update");
    const data = await res.json();
    const serverTimestamp = data.timestamp;

    if (serverTimestamp > lastSeen) {
      console.log("🔁 البيانات تغيّرت، تحديث الكاش...");
      localStorage.clear();
      localStorage.setItem("products_last_update", serverTimestamp);
      location.reload();
      return;
    }

    console.log("✅ الكاش محدث، لا حاجة لإعادة التحميل");

  } catch (err) {
    console.warn("⚠️ فشل التحقق من وقت التحديث، تحميل البيانات كالمعتاد");
  }

  loadProducts(); // 👈 تحميل المنتجات كالمعتاد
});





async function loadProducts() {
  console.log("🚀 دالة loadProducts بدأت");
  console.log("🔍 Local userId:", userId);

  const container = document.getElementById('productsContainer');
  container.innerHTML = '';
  const highlightId = urlParams.get("highlight");
  const isOwner = !urlParams.get("user_id") || urlParams.get("user_id").toLowerCase() === (localStorage.getItem("user_id") || "").toLowerCase();

try {
    const response = await fetch(`${BASE_URL}/api/products_data/${userId}`);
    const products = await response.json();
   
    products.forEach(p => console.log(`🧾 منتج: ${p.name} | user_id: ${p.user_id}`));

    let filtered = [];
    const normalizedUserId = (userId || '').trim().toLowerCase();

    if (highlightId) {
      const target = products.find(p => p.id === highlightId);
      if (target) {
        const targetUserId = (target.user_id || '').trim().toLowerCase();
        const otherUserProducts = products.filter(p =>
          (p.user_id || '').trim().toLowerCase() === targetUserId && p.id !== highlightId
        );
        filtered = [target, ...otherUserProducts];
      } else {
        console.warn("⚠️ لم يتم العثور على المنتج المطلوب، عرض منتجات المستخدم فقط");
        filtered = products.filter(p =>
          (p.user_id || '').trim().toLowerCase() === normalizedUserId
        );
      }
    } else {
      filtered = products.filter(p =>
        (p.user_id || '').trim().toLowerCase() === normalizedUserId
      );
    }
    // ✅ ترتيب المنتجات المثبتة في الأعلى
    filtered.sort((a, b) => (b.pinned === true) - (a.pinned === true));

    if (!filtered.length) {
      container.innerHTML = '<p style="text-align:center; color:#777; margin-top:30px">لا يوجد منتجات مضافة حالياً.</p>';
      return;
    }

for (const product of filtered) {
  product.image = product.image || product.url || '';

  let mediaUrl = "";
  if (product.hls_path) {
    mediaUrl = `/uploads/hls/${product.hls_path}`;
  } else if ((product.image || "").endsWith(".m3u8")) {
    mediaUrl = `/uploads/${(product.image || "").replace(/^.*[\\\/]/, '')}`;
  } else {
    mediaUrl = (product.image || "").startsWith("http")
      ? product.image
      : `/uploads/${(product.image || "").replace(/^.*[\\\/]/, '')}`;
  }

  const isVideo = /\.(mp4|mov|webm|m3u8)$/i.test(mediaUrl);
  const normalizedUserId = (userId || '').trim().toLowerCase();

  // ✅ عرض الفيديوهات في الستوري فقط
  if (isVideo && (product.user_id || '').trim().toLowerCase() === normalizedUserId) {
    renderVideoStory(product);
  }

  // ✅ تجاهل الفيديوهات في كروت المنتجات
  if (isVideo) continue;

  // ✅ المتابعة لعرض المنتجات (الصور فقط)
  const affiliateClicks = await getAffiliateClicks(product.id);
  const isCurrentOwner = (product.user_id || '').trim().toLowerCase() === currentUser;
  const highlightedComment = urlParams.get("comment");
  const card = document.createElement('div');
  card.className = 'product-card';
  card.setAttribute('data-product-id', product.id);

  if (product.pinned) {
    card.style.border = '2px solid gold';
    card.style.boxShadow = '0 0 10px gold';
  }

  const post = product.post?.trim() || "";
  const safePost = post.replace(/`/g, "\\`").replace(/'/g, "\\'").replace(/\n/g, "<br>").replace(/"/g, '&quot;');

  const media = `
    <img src="${mediaUrl}" alt="${product.name}"
         onclick="event.stopPropagation(); openMediaModal('${mediaUrl}', false)"
         style="width: 100%; max-height: 350px; object-fit: cover; border-radius: 8px; cursor: pointer;" />
  `;

  card.innerHTML = `
  ${media}

  ${post ? `
    <div style="padding: 10px 16px 0;">
      <div class="product-ai-post" id="post-${product.id}">${post}</div>
      <span class="see-more" onclick="expandPost('${product.id}', this)" data-i18n="see_more" style="display:block; margin-top:5px; color: #007bff; cursor: pointer;">عرض المزيد</span>
    </div>
  ` : ''}

  <div class="product-card-content">
    <h3>
      ${product.name} ${product.price ? `- ${product.price} ر.ق` : ''}
      ${product.pinned ? '<span style="color:gold; font-size:14px;">📌 مثبّت</span>' : ''}
    </h3>

    <div style="font-size:13px; color:#555; margin: 5px 0;">
       ${product.full_name || product.user_id}
    </div>

    <div style="color:#888; font-size:13px; margin-top:5px;">
      👁️ ${affiliateClicks} مشاهدة
    </div>

    <div class="action-bar">
      <button class="action-btn" onclick="event.stopPropagation(); sharePost(\`${safePost}\`)">
        🔗<span>مشاركة</span>
      </button>
      ${isCurrentOwner && !highlightId ? `
        <button class="action-btn" onclick="event.stopPropagation(); deleteProduct('${product.id}')">
          🗑️<span>حذف</span>
        </button>
        <button class="action-btn" onclick="event.stopPropagation(); pinProduct('${product.id}')">
          📌<span>تثبيت</span>
        </button>
      ` : ''}

 <!-- ✅ زر التعليقات مع العداد فوق الصورة -->
<button class="action-btn" onclick="viewCommentsPopup('${product.id}')" style="
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  text-align: left;
">
  <img src="/static/img/comment_dark.png" alt="تعليقات" style="
    width: 22px;
    height: 22px;
    object-fit: contain;
    display: block;
  ">
  <div style="display: flex; flex-direction: column; line-height: 1; align-items: flex-start;">
    <span style="font-size: 12px; color: #fff;">تعليقات</span>
    <span id="comment-count-${product.id}" style="font-size: 12px; color:rgb(6, 7, 7); font-weight: bold;">0</span>
  </div>
</button>


      <button class="action-btn" onclick="likeProduct('${product.id}')">
        ❤️<span id="likes-${product.id}">0</span>
      </button>
    </div>
  </div>



      ${product.affiliate_link ? `
        <a href="#" onclick="trackAffiliateClick('${product.id}', '${product.affiliate_link}')" style="
          display:block;
          margin-top:10px;
          background-color:#ff4747;
          color:#fff;
          text-align:center;
          padding:10px;
          border-radius:8px;
          font-weight:bold;
          text-decoration:none;
          transition: background 0.3s;
        " onmouseover="this.style.backgroundColor='#e63946'" onmouseout="this.style.backgroundColor='#ff4747'">
          🛒 شراء من AliExpress
        </a>
      ` : ''}

      <div id="comments-${product.id}" style="margin-top: 10px;"></div>
    </div>
  `;

  container.appendChild(card);

  // ✅ جلب عدد التعليقات
fetch(`/get_product_comments/${product.id}`)
  .then(res => res.json())
  .then(data => {
    const count = data.length;
    const replies = data.flatMap(c => c.replies || []);
    const total = count + replies.length;

    const countSpan = document.getElementById(`comment-count-${product.id}`);
    if (countSpan) countSpan.textContent = total;
  })
  .catch(err => console.warn(`❌ فشل تحميل التعليقات للمنتج ${product.id}:`, err));

  setTimeout(() => loadLikes(product.id), 200);
}


    updateContent();

  } catch (err) {
    container.innerHTML = '<p style="color:red; text-align:center;">❌ فشل في تحميل المنتجات.</p>';
    console.error("🚫 خطأ في التحميل:", err);
  }
}
function submitPopupComment() {
  const input = document.getElementById('newComment');
  const comment = input.value.trim();
  if (!comment) return alert("❌ يرجى كتابة تعليق أولاً");

  const commentsList = document.getElementById('commentsList');
  const tempComment = document.createElement('p');
  tempComment.textContent = '• ' + comment;
  tempComment.style.opacity = '0.5';
  commentsList.appendChild(tempComment);

  input.value = '';

  fetch(`${BASE_URL}/add_comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: currentProductId, comment: comment })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      tempComment.style.opacity = '1';
    } else {
      commentsList.removeChild(tempComment);
      alert("❌ فشل إرسال التعليق");
    }
  })
  .catch(err => {
    commentsList.removeChild(tempComment);
    alert("❌ خطأ في إرسال التعليق");
    console.error(err);
  });
}

function viewCommentsPopup(productId) {
  if (!productId) {
    alert("⚠️ لم يتم تحديد المنتج");
    return;
  }

 window.location.href = `/product_comments_sheet?product_id=${encodeURIComponent(productId)}`;

}




document.addEventListener("click", function(e) {
  if (e.target.classList.contains("copy-btn")) {
    const text = e.target.getAttribute("data-post") || "";
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      const successful = document.execCommand("copy");
      if (successful) {
        alert(i18next.t("copy_success"));
      } else {
        alert(i18next.t("copy_error"));
      }
    } catch (err) {
      alert(i18next.t("copy_error"));
    }
    document.body.removeChild(textarea);
  }
});


function sharePost(text) {
  const url = encodeURIComponent(window.location.href);
  const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encodeURIComponent(text)}`;
  window.open(shareUrl, '_blank');
}
function openServiceRequestForm() {
  const modal = document.getElementById('serviceRequestModal');
  modal.classList.add('active'); // ✅ هذا هو المفتاح
  modal.style.display = 'block'; // ✅ لضمان ظهوره
  document.getElementById('modalOverlay').style.display = 'block';
  document.body.classList.add('modal-open');
}



function closeServiceRequestForm() {
  const modal = document.getElementById('serviceRequestModal');
  modal.classList.remove('active');
  modal.style.display = 'none'; // ✅ أخفاء المودال
  document.getElementById('modalOverlay').style.display = 'none';
  document.body.classList.remove('modal-open');
}




async function submitServiceRequest() {
  const type = document.getElementById('serviceType').value;
  const desc = document.getElementById('serviceDescription').value;

  if (!type || !desc) return alert("يرجى تعبئة جميع الحقول");

  const sendBtn = document.getElementById("sendButton");
  const sendText = document.getElementById("sendText");
  const spinner = document.getElementById("spinner");

  // ✅ تفعيل السبينر
  sendBtn.disabled = true;
  sendText.textContent = "📤 جاري الإرسال...";
  spinner.style.display = "inline-block";

  const full_name = localStorage.getItem("full_name") || "غير معروف";
  const user_id = localStorage.getItem("user_id") || "غير معروف";

  const data = {
    user_id,
    full_name,
    type,
    desc
  };

  try {
    const res = await fetch(`${BASE_URL}/submit-service-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (result.status === 'success') {
      alert("✅ تم إرسال الطلب بنجاح");
      closeServiceRequestForm();
    } else {
      alert("❌ حدث خطأ أثناء الإرسال");
    }

  } catch (error) {
    alert("❌ فشل الاتصال بالخادم");
    console.error(error);
  } finally {
    // ✅ إرجاع الزر لحالته الطبيعية
    sendBtn.disabled = false;
    sendText.textContent = "📨 إرسال الطلب";
    spinner.style.display = "none";

    document.documentElement.style.transform = 'none';
    document.body.style.transform = 'none';
    document.body.style.zoom = '100%';
  }
}


async function deleteProduct(id) {
  if (!confirm(i18next.t("delete_confirm"))) return;

  const res = await fetch(`${BASE_URL}/delete-product/${id}`, { method: 'DELETE' });
  const result = await res.json();

  if (result.status === 'success') {
    alert(i18next.t("delete_success"));
    loadProducts(); // أو location.reload() حسب الحاجة
  }
}


async function pinProduct(id) {
  if (!confirm(i18next.t("pin_confirm"))) return;

  try {
    const res = await fetch(`${BASE_URL}/pin-product/${id}`, { method: 'POST' });
    const result = await res.json();

    if (result.status === 'success') {
      location.reload(); // ✅ تحديث فوري للصفحة بعد التثبيت
    } else {
      alert("❌ فشل التثبيت");
    }
  } catch (err) {
    console.error("❌ خطأ:", err);
    alert("⚠️ فشل في الاتصال بالسيرفر");
  }
}





function likeProduct(productId) {
  fetch(`${BASE_URL}/like/${productId}`, { method: 'POST' })
    .then(res => res.json())
    .then(data => {
      document.getElementById(`likes-${productId}`).textContent = data.likes;
    });
}

window.addEventListener('DOMContentLoaded', () => {
  const highlightId = urlParams.get("highlight");
  if (!userId) return window.location.href = 'login.html';


  

  // ✅ إذا الزائر داخل من صفحة all_products وفيه highlight
  if (highlightId && isVisitor) {
    const footer = document.querySelector('.bottom-nav');
    if (footer) footer.style.display = 'none';

    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(btn => {
      const text = btn.textContent.trim();
      if (["حذف", "تثبيت", "إدارة", "رفع", "خدمة"].some(label => text.includes(label))) {
        btn.style.display = 'none';
      }
    });
  }

  // ✅ إذا الزائر بشكل عام (مش صاحب الحساب)
  if (isVisitor) {
  const elementsToHide = [
    "#uploadBtn",
    "#changeLogoBtn",
    "#editStoreBtn",
    "#tabsBtn",
    "#pinBtn",
    "#statsBox",
    "#settingsBtn",
    ".bottom-nav",
    ".store-actions",
    '[onclick="goToUpload()"]',
    '[onclick="goToManageTabs()"]',
    '.logout-btn'
  ];
  elementsToHide.forEach(selector => {
    const el = document.querySelector(selector);
    if (el) el.style.display = "none";
  });
}


  if (highlightId) {
  const highlightedCard = document.querySelector(`[data-product-id="${highlightId}"]`);
  if (highlightedCard) {
    highlightedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}


  updateContent();
});



function loadLikes(productId) {
  fetch(`${BASE_URL}/likes/${productId}`)
    .then(res => res.json())
    .then(data => {
      const likesSpan = document.getElementById(`likes-${productId}`);
      if (likesSpan) {
        likesSpan.textContent = data.likes || 0;
      }
    });
}
function loadComments(productId) {
  fetch(`${BASE_URL}/comments/${productId}`)
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById(`comments-${productId}`);
      if (!container) return;
      container.innerHTML = '';

      data.forEach(comment => {
        const div = document.createElement('div');
        div.style = 'background:#f1f1f1;padding:8px;margin-bottom:6px;border-radius:6px;';
        div.textContent = `💬 ${comment}`;
        container.appendChild(div);
      });
    })
    .catch(err => {
      console.error('❌ فشل في تحميل التعليقات:', err);
    });
}

function requestNotificationPermission() {
  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      importFirebaseMessaging(userId); // لازم تكون الدالة موجودة في store.js
    } else {
      alert("❌ لم يتم السماح بالإشعارات");
    }
  });
}

  // ✅ تسجيل Service Worker للإشعارات
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then(reg => console.log('✅ Service Worker تم تسجيله بنجاح:', reg.scope))
      .catch(err => console.error('❌ فشل في تسجيل Service Worker:', err));
  }


  async function updateCommentBadge() {
   const userId = visitingUser || localUserId;

    if (!userId) return;
  
    try {
      const res = await fetch(`${BASE_URL}/user-comments/${userId}`);
      const comments = await res.json();
      const badge = document.getElementById('commentCountBadge');
  
      // ✅ عد فقط التعليقات غير المقروءة
      const unreadCount = comments.filter(c => !c.comment.read).length;
  
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    } catch (e) {
      console.error('❌ فشل جلب التعليقات:', e);
    }
  }
  
 function trackAffiliateClick(productId, url) {
  fetch(`${BASE_URL}/track-affiliate-click`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: productId })
  }).catch(err => console.error("❌ فشل تتبع النقر:", err));

  // فتح الرابط في تبويب جديد
  window.open(url, '_blank');
}
async function getAffiliateClicks(productId) {
  try {
    const res = await fetch(`${BASE_URL}/affiliate-clicks/${productId}`);
    const data = await res.json();
    return data.clicks || 0;
  } catch (e) {
    console.error("❌ فشل في جلب عدد النقرات:", e);
    return 0;
  }
}
 
if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
  window.addEventListener("scroll", () => {
    const videos = document.querySelectorAll("video");
    videos.forEach(video => {
      if (video.paused && video.readyState >= 2) {
        video.play().catch(() => {});
      }
    });
  });
}
window.addEventListener('scroll', () => {
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    const rect = video.getBoundingClientRect();
    const inView = rect.top >= 0 && rect.bottom <= window.innerHeight;

    if (inView) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  loadStoreInfo();        // ✅ هذا هو المطلوب
 
});




function initHLS(videoId, sourceUrl) {
  const video = document.getElementById(videoId);
  if (!video) return;

  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(sourceUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, function () {
      video.play();
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = sourceUrl;
    video.play();
  }
}


const container = document.getElementById("productsContainer");
const isGlobalMuted = true;



function renderProduct(item) {
  const card = document.createElement("div");
  card.className = "product-card";

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
    video.style.borderRadius = "12px";

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(item.url);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = item.url;
    } else {
      video.outerHTML = `<p style="color:red;">❌ لا يمكن تشغيل الفيديو: ${item.name}</p>`;
    }

    card.appendChild(video);
  } else if (item.type === "image") {
    const img = document.createElement("img");
    img.src = item.url;
    img.alt = item.name || "صورة منتج";
    img.style.width = "100%";
    img.style.borderRadius = "12px";
    card.appendChild(img);
  }

  const caption = document.createElement("div");
  caption.innerHTML = `<strong>${item.name || ""}</strong><br>${item.description || ""}`;
  caption.style.padding = "8px";
  caption.style.color = "#333";
  caption.style.background = "#fff";
  caption.style.borderRadius = "0 0 12px 12px";

  card.appendChild(caption);
  container.appendChild(card);
}



function renderVideoStory(product) {
  const bar = document.getElementById("videoStoriesBar");
  if (!bar || !product.image) return;

  const storyBox = document.createElement("div");
  storyBox.style.width = "70px";
  storyBox.style.height = "100px";
  storyBox.style.borderRadius = "12px";
  storyBox.style.overflow = "hidden";
  storyBox.style.border = "2px solid #ff4747";
  storyBox.style.flex = "0 0 auto";
  storyBox.style.cursor = "pointer";
  storyBox.title = product.name;

  const video = document.createElement("video");
  video.src = product.image.startsWith("http") ? product.image : `${BASE_URL}${product.image}`;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.autoplay = true;
  video.style.width = "100%";
  video.style.height = "100%";
  video.style.objectFit = "cover";

  storyBox.appendChild(video);
  storyBox.onclick = () => {
  const index = products.findIndex(p => p.image === product.image);
  if (index !== -1) {
    document.getElementById("storyOverlay").style.display = "block"; // ✅ إظهار واجهة الستوري
    showVideo(index); // ✅ تشغيل الفيديو وعرض زر واتساب أو علي إكسبريس
  }
};


  bar.appendChild(storyBox);
}




document.addEventListener("DOMContentLoaded", () => {
  const allButtons = document.querySelectorAll("[id^='comment-btn-']");
  allButtons.forEach(btn => {
    const productId = btn.id.replace("comment-btn-", "");
    const key = `comment-count-update-${productId}`;
    const updatedCount = localStorage.getItem(key);

    if (updatedCount !== null) {
      const span = document.getElementById(`comment-count-${productId}`);
      if (span) {
        span.textContent = updatedCount;
      }
      localStorage.removeItem(key); // نحذف المفتاح بعد استخدامه
    }
  });
});


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

