document.getElementById("goldenForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const price = document.getElementById("price").value.trim();
  const imageInput = document.getElementById("imageInput");

  if (!imageInput.files[0]) {
    alert("⚠️ الرجاء اختيار صورة");
    return;
  }

  // 🟡 أولاً: رفع الصورة
  const formData = new FormData();
  formData.append("image", imageInput.files[0]);

  let image_url = "";
  try {
    const imgRes = await fetch("/upload-image", {
      method: "POST",
      body: formData
    });
    const imgData = await imgRes.json();
    image_url = imgData.filename.split('/').pop();  // ناخد فقط اسم الصورة

  } catch (err) {
    alert("❌ فشل رفع الصورة");
    return;
  }

  // 🟢 ثانياً: إرسال بيانات المنتج الذهبي
  const productData = { title, description, price, image: image_url };

  const response = await fetch("/upload-golden-product", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productData)
  });

  const result = await response.json();
  document.getElementById("statusMsg").innerText = result.message || "✅ تم الحفظ";
  // 🧹 تفريغ الحقول بعد النجاح
document.getElementById("goldenForm").reset();

});
