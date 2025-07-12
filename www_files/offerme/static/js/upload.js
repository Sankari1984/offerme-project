let previewContainer;
let confirmBtn;

document.addEventListener('DOMContentLoaded', function () {

  const userId = localStorage.getItem('user_id');

  if (!userId) {
    window.location.href = 'login.html';
    return;
  }

  // تحميل التصنيفات للمستخدم
  fetch(`${window.location.origin}/settings/${userId}`)
    .then(response => response.json())
    .then(data => {
      const categorySelect = document.getElementById('category');
      if (data.tabs && Array.isArray(data.tabs)) {
        data.tabs.forEach(tab => {
          const option = document.createElement('option');
          option.value = tab;
          option.textContent = tab;
          categorySelect.appendChild(option);
        });
      }
    })
    .catch(err => {
      console.error('❌ خطأ في تحميل التصنيفات:', err);
    });

  const form = document.getElementById('uploadForm');
  previewContainer = document.createElement('div');
  previewContainer.id = 'previewContainer';
  form.appendChild(previewContainer);

  confirmBtn = document.createElement('button');
  confirmBtn.textContent = '📤 تأكيد ونشر المنتج';
  confirmBtn.style.display = 'none';
  form.appendChild(confirmBtn);

  document.getElementById('uploadForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    // 🧹 تنظيف المعاينة بالكامل
previewContainer.innerHTML = '';
confirmBtn.style.display = 'none';

// ✅ حذف أي صور تمت إضافتها في المرة السابقة (إن وجدت)
const existingImages = previewContainer.querySelectorAll('img');
existingImages.forEach(img => img.remove());

// ✅ إعادة بناء input file تمامًا حتى لا يحتفظ بالصورة السابقة
const oldInput = document.getElementById('file');
const newInput = document.createElement('input');
newInput.type = 'file';
newInput.name = 'file';
newInput.id = 'file';
oldInput.parentNode.replaceChild(newInput, oldInput);


    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('name', document.getElementById('name').value);
    formData.append('category', document.getElementById('category').value);
    formData.append('description', document.getElementById('description').value);
    formData.append('price', document.getElementById('price').value || '');
    formData.append('file', document.getElementById('file').files[0]);

    try {
      const response = await fetch(`${window.location.origin}/upload-product`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result.status === 'success') {
        previewContainer.innerHTML = `
          <h3>📌 تم توليد البوست:</h3>
          <textarea id="generatedPost" rows="5" style="width: 100%; border: 1px solid #ccc; padding: 10px; border-radius: 6px;">${result.post}</textarea>
        `;
        confirmBtn.style.display = 'block';

        // عند الضغط على "تأكيد ونشر"
        confirmBtn.onclick = async function () {
  const confirmData = new FormData();
  confirmData.append('user_id', userId);
  confirmData.append('name', document.getElementById('name').value);
  confirmData.append('category', document.getElementById('category').value);
  confirmData.append('description', document.getElementById('description').value);
  confirmData.append('price', document.getElementById('price').value || '');
  confirmData.append('post', document.getElementById('generatedPost').value);
  confirmData.append('file', document.getElementById('file').files[0]);

  const confirmRes = await fetch(`${window.location.origin}/confirm-product`, {
    method: 'POST',
    body: confirmData
  });

  const confirmResult = await confirmRes.json();
 if (confirmResult.status === 'success') {
  alert('✅ تم نشر المنتج بنجاح!');

  // 🧹 تفريغ كل الحقول
  document.getElementById('uploadForm').reset();

  // 🧼 تنظيف المعاينة وإعادة تعيينها
  previewContainer.innerHTML = '';
  confirmBtn.style.display = 'none';

  // ⛔ تفريغ حقل البوست إذا تم إنشاؤه يدويًا
  const generatedPost = document.getElementById('generatedPost');
  if (generatedPost) {
    generatedPost.value = '';
  }

  // 🧼 إعادة إنشاء input file بشكل نظيف
  const oldInput = document.getElementById('file');
  const newInput = document.createElement('input');
  newInput.type = 'file';
  newInput.name = 'file';
  newInput.id = 'file';
  oldInput.parentNode.replaceChild(newInput, oldInput);

  // ⬆️ تمرير الصفحة للأعلى
  window.scrollTo(0, 0);
}

};

  

      } else {
        alert('❌ فشل في رفع المنتج: ' + result.message);
      }
    } catch (error) {
      console.error('❌ خطأ أثناء رفع المنتج:', error);
    }
  });
});




async function fetchAliProduct() {
  const link = document.getElementById("aliexpressLink").value.trim();
  if (!link) {
    alert("⚠️ يرجى إدخال رابط منتج من AliExpress");
    return;
  }

  try {
    const res = await fetch(`${window.location.origin}/fetch-aliexpress`, {

      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ link })
    });

    const data = await res.json();

    if (data.error) {
      alert("❌ فشل في جلب المنتج: " + data.error);
      return;
    }

    // تعبئة الحقول تلقائياً
    document.getElementById("name").value = data.title_ar || data.title_en || "";
    document.getElementById("description").value = data.description_ar || data.description_en || "";
    document.getElementById("price").value = parseFloat(data.price);
    document.getElementById("generated_post").value = data.post || "";

    // عرض البوست بشكل مسبق
    const previewContainer = document.getElementById('previewContainer');
    previewContainer.innerHTML = '';
    confirmBtn.style.display = 'none';
    previewContainer.innerHTML = `
      <h3>📌 تم توليد البوست:</h3>
      <textarea id="generatedPost" rows="5" style="width: 100%; border: 1px solid #ccc; padding: 10px; border-radius: 6px;">${data.post || ''}</textarea>
    `;

    confirmBtn.style.display = 'block';

    // عرض الصورة + إدخالها تلقائيًا في input type="file"
    if (data.images && data.images.length > 0) {
      const firstImage = data.images[0];

      // عرض في المعاينة
      const img = document.createElement("img");
      img.src = firstImage;
      img.style.maxWidth = '100%';
      img.style.borderRadius = '8px';
      previewContainer.appendChild(img);

      // تحميل الصورة تلقائياً إلى input file
      const response = await fetch(firstImage);
      const blob = await response.blob();
      const file = new File([blob], "product.jpg", { type: blob.type });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      document.getElementById("file").files = dataTransfer.files;
    }

    alert("✅ تم جلب بيانات المنتج بنجاح!");
  } catch (err) {
    console.error("❌ خطأ أثناء الاتصال بالخادم:", err);
    alert("❌ خطأ أثناء الاتصال بالخادم.");
  }
}
