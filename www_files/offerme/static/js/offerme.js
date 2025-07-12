// ✅ تعريف user_id وتخزينه إن لم يكن موجودًا
const userId = localStorage.getItem("user_id") || "guest_" + Date.now();
localStorage.setItem("user_id", userId);


document.getElementById("offermeForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const description = document.getElementById("description").value;
  const file = document.getElementById("file").files[0];
  const post = document.getElementById("post").value.trim(); // ✅ البوست الناتج من الذكاء

  if (!file) {
    alert("❌ الرجاء اختيار فيديو أو صورة");
    return;
  }

  const userId = localStorage.getItem("user_id");
if (!userId) {
  alert("⚠️ لم يتم التعرف على المستخدم. يرجى تسجيل الدخول.");
  return;
}

const formData = new FormData();
formData.append("user_id", userId); // ✅ نضيف الـ user_id
formData.append("full_name", localStorage.getItem("full_name") || "زائر");
formData.append("name", name);
formData.append("description", description);
document.getElementById("hiddenAffiliate").value = document.getElementById("affiliateLink").value;

formData.append("affiliate_link", document.getElementById("hiddenAffiliate").value);

const price = document.getElementById("price").value.trim();
if (price) {
  formData.append("price", price);
}

const affiliate = document.getElementById("affiliateLink").value.trim();
if (affiliate) {
  formData.append("affiliate", affiliate);
}




  formData.append("file", file);

  const montage = document.getElementById("enableMontage").checked;
  formData.append("montage", montage ? "true" : "false");


  // ✅ إذا يوجد بوست، نرفقه
  if (post) {
    formData.append("post", post);
  }

try {
  const isLocal = window.location.hostname.includes("192.") || window.location.hostname === "localhost";
  const baseUploadUrl = isLocal
    ? "http://192.168.18.11:5001"
    : `${window.location.origin.replace(/:\d+$/, '')}:5001`;

  const res = await fetch(`${baseUploadUrl}/offerme-upload`, {
    method: "POST",
    body: formData
  });


    const data = await res.json();
    if (data.status === "success") {
      alert("✅ تم رفع المنتج بنجاح!");
      document.getElementById("name").value = "";
document.getElementById("description").value = "";
document.getElementById("price").value = "";
document.getElementById("post").value = "";
document.getElementById("file").value = "";
document.getElementById("enableMontage").checked = false;
document.getElementById("preview").innerHTML = "";

     
    } else {
      alert("❌ فشل: " + data.message);
    }
  } catch (err) {
    alert("❌ فشل الاتصال بالسيرفر");
    console.error(err);
  }
});

document.getElementById("generateBtn").addEventListener("click", async function () {
  const name = document.getElementById("name").value.trim();
  const description = document.getElementById("description").value.trim();
  const postBox = document.getElementById("post");

  if (!name || !description) {
    alert("❗ يرجى كتابة اسم ووصف المنتج أولاً");
    return;
  }

  // ✅ إنشاء عنصر الرسالة إذا لم يكن موجود
  let loadingMessage = document.getElementById("loadingMessage");
  if (!loadingMessage) {
    loadingMessage = document.createElement("div");
    loadingMessage.id = "loadingMessage";
    loadingMessage.style.cssText = `
      text-align: center;
      font-size: 18px;
      margin-top: 15px;
      color: #25a18e;
      font-weight: bold;
      animation: pulse 1.5s infinite;
    `;
    loadingMessage.textContent = "🤖✨ جاري استدعاء عباقرة الذكاء الاصطناعي... انتظر المفاجأة 💡🚀";
    postBox.parentNode.insertBefore(loadingMessage, postBox);
  }
  loadingMessage.style.display = "block";
  postBox.value = "";

  try {
  const isLocal = window.location.hostname.includes("192.") || window.location.hostname === "localhost";
  const baseUploadUrl = isLocal
    ? "http://192.168.18.11:5001"
    : `${window.location.origin.replace(/:\d+$/, '')}:5001`;

  const res = await fetch(`${baseUploadUrl}/generate-post`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name, description })
  });

    const data = await res.json();
    loadingMessage.style.display = "none";

    if (data.status === "success" && data.post) {
      postBox.value = data.post;
    } else {
      postBox.value = "❌ فشل توليد البوست.";
    }
  } catch (err) {
    console.error("❌ خطأ في الاتصال بالسيرفر:", err);
    loadingMessage.style.display = "none";
    postBox.value = "❌ فشل الاتصال بالخادم.";
  }
});

// ✅ عرض معاينة الفيديو أو الصورة بعد اختيار الملف
document.getElementById("file").addEventListener("change", function () {
  const preview = document.getElementById("preview");
  preview.innerHTML = "";

  const file = this.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  const type = file.type;

  if (type.startsWith("image/")) {
    const img = document.createElement("img");
    img.src = url;
    img.style.maxWidth = "100%";
    img.style.borderRadius = "8px";
    img.style.marginTop = "15px";
    preview.appendChild(img);
  } else if (type.startsWith("video/")) {
    const video = document.createElement("video");
    video.src = url;
    video.controls = true;
    video.muted = true;
    video.autoplay = true;
    video.style.maxWidth = "100%";
    video.style.borderRadius = "8px";
    video.style.marginTop = "15px";
    preview.appendChild(video);
  }
});
