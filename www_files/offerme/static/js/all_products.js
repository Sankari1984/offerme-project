let currentPage = 1;
const PRODUCTS_PER_PAGE = 20;
let isLoadingPage = false;
let totalProducts = null;


const MIN_LOADING_TIME = 3000;
let loadingStart = Date.now();

window.addEventListener("load", () => {
  const loading = document.getElementById("loadingScreen");
  const timePassed = Date.now() - loadingStart;
  const remainingTime = Math.max(0, MIN_LOADING_TIME - timePassed);

  setTimeout(() => {
    if (loading) {
      loading.style.opacity = "0";
      setTimeout(() => {
        loading.style.display = "none";
      }, 800);
    }
  }, remainingTime);
});



// ✅ all_products.js


const BASE_URL = window.location.origin;


async function loadCategories() {
  try {
    const res = await fetch(`${BASE_URL}/categories`);
    const categories = await res.json();
    const container = document.getElementById("categoryList");
    container.innerHTML = "";

    categories.forEach(cat => {
      const div = document.createElement("div");
      div.className = "category-box"; // ✅ كلاس جديد
      div.textContent = cat;
      div.onclick = () => {
        window.location.href = `/category_products.html?category=${encodeURIComponent(cat)}`;
      };
      container.appendChild(div);
    });

  } catch (err) {
    console.error("❌ خطأ أثناء تحميل التصنيفات:", err);
  }
}


let currentProductId = null;

function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

function openUserStories(userId) {
  window.location.href = `/stories.html?user_id=${userId}`;
}

function submitPopupComment() {
  const input = document.getElementById('newComment');
  const comment = input.value.trim();
  if (!comment) return alert("❌ يرجى كتابة تعليق أولاً");

  const commentsList = document.getElementById('commentsList');
  const tempComment = document.createElement('p');
  tempComment.textContent = '• ' + comment;
  tempComment.style.opacity = '0.6';
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
        alert("❌ فشل إرسال التعليق");
        commentsList.removeChild(tempComment);
      }
    })
    .catch(err => {
      console.error("❌ فشل في إرسال التعليق:", err);
      alert("❌ خطأ في إرسال التعليق");
      commentsList.removeChild(tempComment);
    });
}

function viewComments(productId) {
  currentProductId = productId;
  fetch(`${BASE_URL}/comments/${productId}`)
    .then(res => res.json())
    .then(comments => {
      const commentsList = document.getElementById('commentsList');
      commentsList.innerHTML = '';
      if (comments.length === 0) {
        commentsList.innerHTML = '<p>لا توجد تعليقات بعد.</p>';
      } else {
        comments.forEach(comment => {
          const p = document.createElement('p');
          p.textContent = '• ' + comment;
          commentsList.appendChild(p);
        });
      }
      document.getElementById('commentPopup').style.display = 'block';
      document.getElementById('popupOverlay').style.display = 'block';
    });
}

function closePopup() {
  document.getElementById('commentPopup').style.display = 'none';
  document.getElementById('popupOverlay').style.display = 'none';
  document.getElementById('newComment').value = '';
}

function sortByLikes() {
  fetch('/products_all')
    .then(res => res.json())
    .then(products => {
      products.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      localStorage.setItem('allProducts', JSON.stringify(products));
      localStorage.setItem('cachedProducts', JSON.stringify(products));

      const imagesOnly = products.filter(p => {
        const ext = (p.image || "").toLowerCase();
        return !ext.endsWith(".mp4") && !ext.endsWith(".mov") && !ext.endsWith(".webm");
      });

      displayProducts(imagesOnly);
    });
}

function sortByPrice() {
  fetch('/products_all')
    .then(res => res.json())
    .then(products => {
      products.sort((a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0));
      localStorage.setItem('allProducts', JSON.stringify(products));
      localStorage.setItem('cachedProducts', JSON.stringify(products));
      displayProducts(products);
    });
}


async function getUserSettings(userId) {
  try {
    const res = await fetch(`/user-settings/${userId}`);
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("❌ فشل في جلب إعدادات الزبون", e);
    return null;
  }
} // ← هذا القوس كان مفقوداً

async function displayProducts(products, reset = true) {
  const container = document.getElementById('productGrid');
  if (reset !== false) container.innerHTML = '';

  const enrichedProducts = await Promise.all(products.map(async (product) => {
    const [affiliateClicks, settings] = await Promise.all([
      getAffiliateClicks(product.id),
      getUserSettings(product.user_id)
    ]);
    return { ...product, affiliateClicks, settings };
  }));

  for (const product of enrichedProducts) {
    const isVideo = product.image.toLowerCase().endsWith('.mp4') || product.image.toLowerCase().endsWith('.mov');
    const mediaHTML = isVideo
      ? `<video src="${product.image}#t=0.1" controls class="product-media"></video>`
      : `<img src="${product.image}" alt="${product.name}" class="product-media">`;

    const priceHTML = product.price ? `<p class="product-price">${product.price} ر.ق</p>` : '';
    const phone = product.settings?.phone || '';
    const whatsapp = product.settings?.whatsapp || '';
    const messageText = `👋 مرحبًا! هذا رابط صورة المنتج:\n${product.image}`;
    const whatsappLink = `https://wa.me/${whatsapp.replace(/\D/g, '').replace(/^0+/, '').replace(/^/, '974')}?text=${encodeURIComponent(messageText)}`;

    const contactButtons = (phone || whatsapp)
      ? `<div class="contact-buttons">
          ${phone ? `<a href="tel:${phone}" class="icon-btn" title="اتصال"><img src="/static/icons/phone.svg" alt="اتصال"></a>` : ''}
          ${whatsapp ? `<a href="${whatsappLink}" class="icon-btn" target="_blank" title="واتساب"><img src="/static/icons/whatsapp.svg" alt="واتساب"></a>` : ''}
        </div>`
      : '<div style="margin-top:10px; color:gray; font-size:12px; text-align:center;">رقم غير متوفر</div>';

    container.innerHTML += `
      <div class="product-card">
        <a href="/store.html?user_id=${encodeURIComponent(product.user_id)}&highlight=${product.id}" onclick="saveCurrentProducts()">
          ${mediaHTML}
        </a>
        ${priceHTML}
        <p class="product-description">${product.description || ''}</p>
        <div class="like-comment-bar">
          <button class="like-btn" data-id="${product.id}">❤️ <span id="likes-${product.id}">${product.likes || 0}</span></button>
          <button onclick="viewComments('${product.id}')">💬 عرض التعليقات</button>
        </div>
        <div class="store-link" onclick="window.location.href='/user_store.html?user_id=${product.user_id}'">
          📍 ${product.user_id}
        </div>
        ${contactButtons}
        ${product.affiliate_link ? `
          <div style="margin-top: 12px; text-align: center;">
            <a href="#" onclick="trackAffiliateClick('${product.id}', '${product.affiliate_link.replace(/'/g, "\\'")}')" style="
              display: inline-block;
              background: linear-gradient(90deg, #e63946, #ff6b6b);
              color: white;
              padding: 10px 20px;
              border-radius: 50px;
              font-size: 15px;
              font-weight: bold;
              text-decoration: none;
              transition: 0.3s;
              box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
              🛒 اشتري الآن من AliExpress
            </a>
            <div style="margin-top: 6px; font-size: 13px; color: #666;">
              👁️ <strong>${product.affiliateClicks}</strong> مشاهدة
            </div>
          </div>` : ''}
      </div>`;
  }

  // ❤️ أزرار الإعجاب بعد عرض المنتجات
  document.querySelectorAll(".like-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const productId = btn.getAttribute("data-id");
      const res = await fetch(`/like/${productId}`, { method: 'POST' });
      const data = await res.json();
      const span = document.getElementById(`likes-${productId}`);
      if (span) span.textContent = data.likes;
    });
  });
}


function saveCurrentProducts() {
  const products = JSON.parse(localStorage.getItem("paged_products") || "[]");
  sessionStorage.setItem("tempProducts", JSON.stringify(products));
  sessionStorage.setItem("tempPage", currentPage);
  sessionStorage.setItem("scrollY", window.scrollY);
}

function loadStoryIcons() {
  fetch("/users")
    .then(res => res.json())
    .then(users => {
      const container = document.getElementById("storiesBar");
      container.innerHTML = "";

      users.forEach(user => {
        fetch(`/user-settings/${user.user_id}`)
          .then(res => res.json())
          .then(settings => {
            fetch(`/user-videos/${user.user_id}`)
              .then(res => res.json())
              .then(videos => {
                const lastVideo = videos.length > 0 ? videos[videos.length - 1].filename : null;
                const preview = lastVideo
                  ? `/${lastVideo}#t=0.5`
                  : (settings.logo || "/static/img/default_logo.png");

                const div = document.createElement("div");
                div.className = "story-icon";
                div.onclick = () => window.location.href = `stories.html?user_id=${user.user_id}`;

                div.innerHTML = lastVideo
                  ? `<video src="${preview}" class="story-thumb" muted autoplay loop playsinline></video>
                     <span>${user.full_name}</span>`
                  : `<img src="${preview}" class="story-thumb" alt="${user.full_name}">
                     <span>${user.full_name}</span>`;

                container.appendChild(div);
              });
          });
      });
    });
}

// ✅ استرجاع المنتجات من الكاش المؤقت (للرجوع السريع من صفحة المنتج)
const tempProducts = sessionStorage.getItem("tempProducts");
if (tempProducts) {
  const parsed = JSON.parse(tempProducts);
  displayProducts(parsed, true);
  currentPage = parseInt(sessionStorage.getItem("tempPage") || "1");

  // ⏫ استرجاع موقع التمرير
  const scrollY = parseInt(sessionStorage.getItem("scrollY") || "0");
  window.scrollTo(0, scrollY);

  // 🧹 حذف البيانات المؤقتة بعد الاسترجاع
  sessionStorage.removeItem("tempProducts");
  sessionStorage.removeItem("tempPage");
  sessionStorage.removeItem("scrollY");
}



document.addEventListener("DOMContentLoaded", () => {
  loadCategories();
  loadStoryIcons();

  const cached = localStorage.getItem('cachedProducts');
  if (cached) {
    const products = JSON.parse(cached);
    const imagesOnly = products.filter(p => {
  const ext = (p.image || "").toLowerCase();
  return !ext.endsWith(".mp4") && !ext.endsWith(".mov") && !ext.endsWith(".webm");
});
displayProducts(imagesOnly);

    localStorage.removeItem('cachedProducts');
  } else {
    sortByLikes();
  }

  const urlParams = new URLSearchParams(window.location.search);
  const fromUser = urlParams.get("from_user");
  const backBtn = document.getElementById("backToStoreBtn");
  if (fromUser && backBtn) {
    backBtn.style.display = "inline-block";
    backBtn.addEventListener("click", () => {
      localStorage.setItem("user_id", fromUser);
      window.location.href = "/store.html";
    });



  }
    loadGoldenProducts(); // ✅ تحميل المنتجات الذهبية داخل نفس الحدث

  // ✅ ✅ هنا أضف كود الانترو داخل نفس الحدث
 const waitForStart = setInterval(() => {
  const loading = document.getElementById("loadingScreen");

  if (!loading || !loadingStart) return;

  clearInterval(waitForStart);

  const timePassed = Date.now() - loadingStart;
  const remainingTime = Math.max(0, MIN_LOADING_TIME - timePassed);

  // 🟢 أولاً: تحميل المنتجات الذكي أثناء الانترو
   loadNextPage().then(() => {

    // ✅ بعد تحميل المنتجات والانتهاء من الانترو، أخفي الشاشة
    setTimeout(() => {
      loading.style.opacity = "0";
      setTimeout(() => {
        loading.style.display = "none";
      }, 800);
    }, remainingTime);
  });
}, 100);



});

// 🔄 تحميل الصفحة التالية عند التمرير للأسفل
const sentinel = document.createElement("div");
sentinel.id = "sentinel";
document.body.appendChild(sentinel);

const observer = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) {
    loadNextPage();
  }
}, {
  rootMargin: '300px'
});
observer.observe(sentinel);


function trackAffiliateClick(productId, url) {
  fetch(`${BASE_URL}/track-affiliate-click`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: productId })
  }).catch(err => console.error("❌ فشل تتبع النقر:", err));

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
fetch(`${BASE_URL}/latest-product`)
  .then(res => res.json())
  .then(product => {
    if (product && product.name) {
      const container = document.getElementById("newProductAlert");
      const userId = product.user_id;
      const productId = product.id;
      const fullName = userId; // يمكنك تحسين هذا لاحقًا بجلب full_name
      container.innerHTML = `✅ تم رفع منتج جديد في متجر <strong>${fullName}</strong> - 
        <a href="/store.html?user_id=${userId}&highlight=${productId}" style="color:blue;">عرض المنتج</a>`;
      container.style.display = "block";
    }
  });

fetch(`${BASE_URL}/latest-image-product`)
  .then(res => res.json())
  .then(product => {
    if (product && product.name && product.user_id) {
      const alertBar = document.getElementById("newProductAlert");
      alertBar.innerHTML = `🛍️ تم رفع منتج جديد في <a href="/store.html?user_id=${product.user_id}&highlight=${product.id}" style="text-decoration:underline; color:blue;">متجر ${product.user_id}</a> - ${product.name}! ✨`;
      alertBar.style.display = 'block';
    }
  })
  .catch(err => console.error("❌ خطأ في جلب آخر منتج:", err));

async function performSmartSearch() {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) return alert("❌ يرجى كتابة ما تريد البحث عنه");

  const res = await fetch("/smart-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });

  const result = await res.json();

  if (!result.success) {
    alert("❌ فشل في التحليل الذكي");
    return;
  }

  const filtered = JSON.parse(localStorage.getItem("allProducts") || "[]").filter(p => {
    const name = (p.name || "").toLowerCase();
    const desc = (p.description || "").toLowerCase();
    const price = parseFloat(p.price || "0");

    const matchesKeyword = result.keywords.some(k => name.includes(k) || desc.includes(k));
    const matchesCategory = result.category ? name.includes(result.category) || desc.includes(result.category) : true;
    const matchesPrice = result.max_price ? price <= result.max_price : true;

    return matchesKeyword && matchesCategory && matchesPrice;
  });

  displayProducts(filtered);
}

function loadGoldenProducts() {
  fetch("/golden-products")
    .then(res => res.json())
    .then(products => {
      console.log("✅ تم تحميل المنتجات الذهبية:", products); // ← أضف هذا السطر للتأكد
      const slider = document.getElementById("golden-slider");
      if (!products.length) {
        console.log("❌ لا توجد منتجات ذهبية لعرضها");
        document.getElementById("golden-section").style.display = "none";
        return;
      }

      products.forEach(prod => {
        const card = document.createElement("div");
        card.className = "golden-card";
        card.innerHTML = `
          <img src="${prod.image}" alt="${prod.title}">
          <h4>${prod.title}</h4>
          <p>${prod.description}</p>
          <strong>${prod.price}</strong>
        `;
        slider.appendChild(card);
      });
    })
    .catch(err => {
      console.error("❌ خطأ تحميل المنتجات الذهبية:", err);
      document.getElementById("golden-section").style.display = "none";
    });
}



async function loadProductsSmart() {
  const cachedProducts = localStorage.getItem("all_products");
  const lastCachedTime = localStorage.getItem("last_update") || "0";

  if (cachedProducts) {
    displayProducts(JSON.parse(cachedProducts)); // ✅ عرض المنتجات فوراً من الكاش
  }

  try {
    const res = await fetch(`${BASE_URL}/products-last-update`);
    const { last_update } = await res.json();

    if (parseInt(last_update) > parseInt(lastCachedTime)) {
      console.log("🟢 يوجد تحديث جديد، سيتم تحميل المنتجات...");
      const allRes = await fetch(`${BASE_URL}/all-products`);
      const allData = await allRes.json();

      localStorage.setItem("all_products", JSON.stringify(allData));
      localStorage.setItem("last_update", last_update);

      displayProducts(allData); // تحديث الواجهة
    } else {
      console.log("✅ لا توجد تحديثات، استخدام الكاش الحالي.");
    }
  } catch (err) {
    console.error("❌ فشل التحقق من وجود تحديث:", err);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
 const tempProducts = sessionStorage.getItem("tempProducts");
if (tempProducts) {
  const parsed = JSON.parse(tempProducts);
  await displayProducts(parsed, true);
  currentPage = parseInt(sessionStorage.getItem("tempPage") || "1");

  // 🧹 إزالة البيانات المؤقتة
  sessionStorage.removeItem("tempProducts");
  sessionStorage.removeItem("tempPage");

  // ⏫ استعادة موضع التمرير بعد قليل
  setTimeout(() => {
    const scrollY = parseInt(sessionStorage.getItem("scrollY") || "0");
    window.scrollTo(0, scrollY);
    sessionStorage.removeItem("scrollY");
  }, 300);

  // ⏳ تحميل الصفحة التالية بهدوء
  setTimeout(() => loadNextPage(), 500);
  return;
}

// ✅ إذا لم يوجد كاش مؤقت، تابع الطريقة العادية
const pagedCached = JSON.parse(localStorage.getItem("paged_products") || "[]");
if (pagedCached.length > 0) {
  currentPage = parseInt(localStorage.getItem("last_page") || "1");
  await displayProducts(pagedCached);  // ✅ عرض المنتجات فورًا
  setTimeout(() => loadNextPage(), 500); // ⏳ تحميل الصفحة التالية بهدوء
} else {
  loadNextPage();
}


  if (pagedCached.length > 0) {
    currentPage = parseInt(localStorage.getItem("last_page") || "1");
    await displayProducts(pagedCached);  // ✅ عرض المنتجات فورًا
    setTimeout(() => loadNextPage(), 500); // ⏳ تحميل الصفحة التالية بهدوء
  } else {
    loadNextPage();
  }
});



async function loadNextPage() {
  if (isLoadingPage || allProductsFinished) return;

  isLoadingPage = true;
  try {
    const res = await fetch(`${BASE_URL}/products-page?page=${currentPage}&limit=${PRODUCTS_PER_PAGE}`);
    const data = await res.json();
    const newProducts = data.products;

    if (!newProducts || newProducts.length === 0) {
      allProductsFinished = true;
      console.log("✅ لا توجد منتجات إضافية للتحميل");
      return;
    }

    // ✅ حفظ المنتجات في localStorage
    let existing = JSON.parse(localStorage.getItem("paged_products") || "[]");
    existing = existing.concat(newProducts);
    localStorage.setItem("paged_products", JSON.stringify(existing));
    localStorage.setItem("last_page", currentPage);

    // ✅ عرض المنتجات بدون مسح السابقين
    await displayProducts(newProducts, false);

    // ✅ زيادة رقم الصفحة بعد التحميل
    currentPage++;
  } catch (err) {
    console.error("❌ فشل تحميل صفحة المنتجات:", err);
  } finally {
    isLoadingPage = false;
  }
}
function clearProductCache() {
  localStorage.removeItem("paged_products");
  localStorage.removeItem("last_page");
}
