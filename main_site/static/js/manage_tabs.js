document.addEventListener('DOMContentLoaded', function () {
  const userId = localStorage.getItem('user_id');

  if (!userId) {
    window.location.href = 'login.html';
    return;
  }

  // ✅ تحميل المعلومات
  fetch(`${window.location.origin}/settings/${userId}`)
    .then(response => response.json())
    .then(data => {
      document.getElementById('phone').value = data.phone || '';
      document.getElementById('instagram').value = data.instagram || '';
      document.getElementById('whatsapp').value = data.whatsapp || '';
      document.getElementById('facebook').value = data.facebook || '';
      document.getElementById('tiktok').value = data.tiktok || '';
      document.getElementById('website').value = data.website || '';
    });

  // ✅ حفظ البيانات
  document.getElementById('tabsForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const phone = document.getElementById('phone').value.trim();
    const instagram = document.getElementById('instagram').value.trim();
    const whatsapp = document.getElementById('whatsapp').value.trim();
    const facebook = document.getElementById('facebook').value.trim();
    const tiktok = document.getElementById('tiktok').value.trim();
    const website = document.getElementById('website').value.trim();

    fetch(`${window.location.origin}/settings/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        tabs: [], 
        phone, 
        instagram, 
        whatsapp,
        facebook,
        tiktok,
        website
      })
    })
      .then(response => response.json())
      .then(result => {
        if (result.status === 'success') {
          alert('✅ تم حفظ الإعدادات');
          window.location.href = 'store.html';
        } else {
          alert('❌ فشل في الحفظ');
        }
      })
      .catch(error => {
        console.error('❌ خطأ في الحفظ:', error);
      });
  });
});
