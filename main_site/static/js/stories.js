document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get("user_id");
  const container = document.getElementById('videoContainer');

  try {
    let videos = [];

    if (userId) {
      const res = await fetch(`/user-videos/${userId}`);
      videos = await res.json();

      const settingsRes = await fetch(`/user-settings/${userId}`);
      const settings = await settingsRes.json();

      videos.forEach(video => {
        const wrapper = document.createElement('div');
        wrapper.className = "story-wrapper";

        const vid = document.createElement('video');
        vid.src = `/${video.filename}`;
        vid.setAttribute('playsinline', '');
        vid.setAttribute('muted', 'true');
        vid.setAttribute('loop', 'true');
        vid.setAttribute('autoplay', 'true');
        vid.className = 'story-video';
        wrapper.appendChild(vid);

        const logo = document.createElement("img");
        logo.src = settings.logo || "/uploads/default_logo.png";
        logo.className = "story-logo";
        wrapper.appendChild(logo);

        const name = document.createElement("div");
        name.className = "story-username";
        name.textContent = settings.full_name || "الزبون";
        wrapper.appendChild(name);

        container.appendChild(wrapper);
      });

    } else {
      const res = await fetch('/all-stories');
      videos = await res.json();
      videos.sort((a, b) => b.timestamp - a.timestamp);

      for (const video of videos) {
        const wrapper = document.createElement('div');
        wrapper.className = "story-wrapper";

        const vid = document.createElement('video');
        vid.src = `/${video.filename}`;
        vid.setAttribute('playsinline', '');
        vid.setAttribute('muted', 'true');
        vid.setAttribute('loop', 'true');
        vid.setAttribute('autoplay', 'true');
        vid.className = 'story-video';
        wrapper.appendChild(vid);

        try {
          if (video.user_id) {
            const res = await fetch(`/user-settings/${video.user_id}`);
            const settings = await res.json();

            const logo = document.createElement("img");
            logo.src = settings.logo || "/uploads/default_logo.png";
            logo.className = "story-logo";
            wrapper.appendChild(logo);

            const name = document.createElement("div");
            name.className = "story-username";
            name.textContent = settings.full_name || "الزبون";
            wrapper.appendChild(name);
          }
        } catch (err) {
          console.warn("⚠️ تعذر تحميل إعدادات الزبون");
        }

        container.appendChild(wrapper);
      }
    }

    // ✅ تشغيل فيديو واحد فقط
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting) {
          video.muted = false;
          video.play();
        } else {
          video.pause();
          video.muted = true;
        }
      });
    }, { threshold: 0.6 });

    document.querySelectorAll('video').forEach(video => observer.observe(video));

  } catch (err) {
    console.error("❌ خطأ:", err);
    container.innerHTML = "<p style='color:red;text-align:center;'>❌ تعذر تحميل الفيديوهات</p>";
  }
});
