// TiktokViewer.js

import Hls from "hls.js";
import React, { useEffect, useRef, useState } from "react";

import Loader from "./Loader";
const highlightedStyle = {
      outline: "3px solid #007bff",
      boxShadow: "0 0 20px rgba(0, 123, 255, 0.5)",
      transition: "all 0.4s ease-in-out"
  };

const TiktokViewer = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  const [savedProducts, setSavedProducts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("savedProducts") || "[]");
    } catch {
      return [];
    }
  });
  const videoRefs = useRef([]);

 useEffect(() => {
  fetch("https://offermeqa.com/data/products_data.json")
    .then((res) => res.json())
    .then((data) => {
      // const videos = data.filter((item) => item.type === "video");
         const videos = data; // ✅ الآن سيأخذ كل المنتجات سواء كانت صورة أو فيديو


      Promise.all(
  videos.map((item) =>
    fetch(`/uploads/settings_user_${encodeURIComponent(item.user_id)}.json`)
      .then((res) => res.json())
      .then((settings) => {
        return fetch(`/get_comment_count/${item.id}`)
          .then((res) => res.ok ? res.json() : { count: 0 })
          .then((commentData) => {
            return {
              ...item,
              userImage: settings.logo
              ? settings.logo
              : "/static/img/user.png",

              whatsapp: settings.whatsapp || "",
              affiliate: item.affiliate || "",
              comments_count: commentData.count || 0,
            };
          });
      })
      .catch(() => {
        console.warn("⚠️ لم يتم العثور على إعدادات الزبون:", item.user_id);
        return {
          ...item,
          userImage: "/static/img/user.png",
        };
      })
  )
)

      .then((updated) => {
        setProducts(updated);
        setLoading(false);
const urlParams = new URLSearchParams(window.location.search);
const highlightId = urlParams.get("highlight_id");

if (highlightId) {
  setTimeout(() => {
    const index = updated.findIndex((item) => item.id === highlightId);
    if (index !== -1 && videoRefs.current[index]) {
      const el = videoRefs.current[index];
      el.scrollIntoView({ behavior: "smooth" });

      // أضف تأثير التمييز
      Object.assign(el.style, highlightedStyle);

      // أزِل التأثير بعد ثانيتين
      setTimeout(() => {
        Object.keys(highlightedStyle).forEach((key) => {
          el.style[key] = "";
        });
      }, 2000);
    }
  }, 300);
}

      });
    })
    .catch((err) => {
      console.error("فشل تحميل المنتجات:", err);
      setLoading(false);
    });
}, []);



  useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target.querySelector("video");
        if (!video) return;

        if (entry.isIntersecting) {
          video.muted = !soundOn;
          video.play().catch(() => {});
        } else {
          video.pause();
          video.muted = true; // ✅ منع الصوت من الفيديوهات الغير ظاهرة
        }
      });
    },
    { threshold: 0.8 }
  );

  videoRefs.current.forEach((ref) => {
    if (ref) observer.observe(ref);
  });

  return () => observer.disconnect();
}, [products, soundOn]);



  const toggleSave = (index, url) => {
    let saved = [...savedProducts];
    if (saved.includes(url)) {
      saved = saved.filter((item) => item !== url);
    } else {
      saved.push(url);
    }
    localStorage.setItem("savedProducts", JSON.stringify(saved));
    setSavedProducts(saved); // تحديث الحالة فوراً
    setProducts((prev) => [...prev]); // لإعادة الريندر
  };

  const toggleLike = (index) => {
  const btn = document.getElementById(`like-${index}`);
  const img = document.getElementById(`like-img-${index}`);
  if (!btn || !img) return;

  const liked = btn.dataset.liked === "true";
  btn.dataset.liked = liked ? "false" : "true";
  img.src = liked ? "/static/img/like.png" : "/static/img/liked.png";
};


  return (
    <div style={containerStyle}>
      <button onClick={() => setSoundOn(!soundOn)} style={soundBtnStyle}>
        {soundOn ? "🔊 صوت" : "🔇 كتم"}
      </button>

      {loading ? (
        <Loader />
      ) : (
        products.map((item, index) => (
          <div
            key={item.id}
            ref={(el) => (videoRefs.current[index] = el)}
            style={slideStyle}
          >
     {item.url.endsWith(".jpg") || item.url.endsWith(".png") || item.url.endsWith(".jpeg") ? (
  <img src={item.url} alt={item.name} style={{ ...videoStyle, objectFit: "cover" }} />
) : (
  <video
    ref={(el) => {
      if (el && item.url.endsWith(".m3u8")) {
        if (Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(item.url);
          hls.attachMedia(el);
        } else if (el.canPlayType("application/vnd.apple.mpegurl")) {
          el.src = item.url;
        }
      } else if (el) {
        el.src = item.url;
      }
    }}
    muted={!soundOn}
    autoPlay
    loop
    playsInline
    style={videoStyle}
  />
)}



            {/* أزرار الجهة اليمنى */}
          <div style={rightButtonsStyle}>
  {/* صورة الزبون */}
  <img src={item.userImage} alt="user" style={userImageStyle} />
{/* زر الإعجاب */}
<button
  type="button"
  id={`like-${index}`}
  data-liked="false"
  onClick={() => toggleLike(index)}
  style={iconBtn}
>
  <img
    id={`like-img-${index}`}
    src="/static/img/like.png"
    alt="Like"
    style={iconImageStyle}
/>
</button>

{/* زر المتجر */}
<button
  type="button"
  onClick={() =>
    window.open(`store.html?user_id=${item.user_id}&visitor=true`, "_blank")
  }
  style={iconBtn}
>
  <img src="/static/img/store.png" alt="Store" style={iconImageStyle} />
</button>

{/* زر المشاركة */}
<button
  type="button"
  onClick={() => {
    const previewUrl = `https://offermeqa.com/react-tiktok/?highlight_id=${item.id}`;
    const message = `${item.name}\n${item.description}\n${previewUrl}`;

    if (navigator.share) {
      navigator.share({
        title: item.name,
        text: item.description,
        url: previewUrl // ✅ استعمل المتغير الصحيح
      });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
    }
  }}
  style={iconBtn}
>
  <img src="/static/img/share.png" alt="Share" style={iconImageStyle} />
</button>






{/* زر الحفظ */}
<button
  type="button"
  onClick={() => toggleSave(index, item.url)}
  style={iconBtn}
>
  <img
    src={`/static/img/${savedProducts.includes(item.url) ? "saved.png" : "save.png"}`}
    alt="Save"
    style={iconImageStyle}
/>
</button>


{/* زر الكومينتات */}
{/* زر التعليقات مع التحديث التلقائي */}
<div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
  <button
    type="button"
    onClick={() => {
      window.open(`/product_comments_sheet?product_id=${item.id}`, "_blank");

      const key = `comment-count-update-${item.id}`;
      const interval = setInterval(() => {
        const updated = localStorage.getItem(key);
        if (updated) {
          setProducts((prev) => {
            const updatedList = [...prev];
            updatedList[index].comments_count = parseInt(updated, 10);
            return updatedList;
          });
          localStorage.removeItem(key);
          clearInterval(interval);
        }
      }, 500);
    }}
    style={iconBtn}
  >
    <img src="/static/img/comment.png" alt="Comment" style={iconImageStyle} />
  </button>
  {item.comments_count > 0 && (
    <span style={{
      marginTop: "4px",
      color: "#fff",
      fontSize: "14px",
      fontWeight: "900", // بولد أكثر
      lineHeight: "1"
    }}>
      {item.comments_count}
    </span>
  )}
</div>


  {/* زر الشراء أو واتساب */}
  {item.affiliate && item.affiliate !== "" ? (
  <button onClick={() => window.open(item.affiliate, "_blank")} style={iconBtn}>
    <img src="/static/img/aliexpress.png" alt="AliExpress" style={iconImageStyle} />
  </button>
) : item.whatsapp && item.whatsapp !== "" ? (
  <button onClick={() => window.open("https://wa.me/974" + item.whatsapp, "_blank")} style={iconBtn}>
    <img src="/static/img/whatsapp.png" alt="WhatsApp" style={iconImageStyle} />
  </button>
) : null}

</div>
            {/* نص المنتج أسفل الفيديو */}
            <div style={overlayStyle}>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
            </div>
          </div>
        ))
      )}
   <FooterLoader />  {/* ✅ هذا هو الفوتر الموحد */}
</div>
);
};




const FooterLoader = () => {
  const [html, setHtml] = useState("");

  useEffect(() => {
    fetch(
      `${process.env.PUBLIC_URL}/static/components/footer.html?v=` + Date.now()
    )
      .then((res) => res.text())
      .then((data) => setHtml(data));
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

const containerStyle = {
  width: "100%",
  height: "100vh",
  overflowY: "scroll",
  scrollSnapType: "y mandatory",
  backgroundColor: "#000"
};

const slideStyle = {
  scrollSnapAlign: "start",
  height: "100vh",
  width: "100vw",
  position: "relative",
  overflow: "hidden",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};


const videoStyle = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  backgroundColor: "#000",
  position: "absolute",
  top: 0,
  left: 0,
  zIndex: 1
};







const overlayStyle = {
  position: "absolute",
  bottom: "calc(60px + 20px)", // 60px ارتفاع الفوتر + 20px هامش

  left: "20px",
  right: "20px",
  color: "#fff",
  zIndex: 10,
  paddingRight: "80px"
};




const rightButtonsStyle = {
  position: "absolute",
  right: "10px",
  bottom: "200px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  alignItems: "center",
  zIndex: 999
};

const iconBtn = {
  background: "transparent",
  border: "none",
  borderRadius: "50%",
  width: "48px",
  height: "48px",
  cursor: "pointer",
  padding: 0
};


const userImageStyle = {
  width: "54px",
  height: "54px",
  borderRadius: "50%",
  border: "2px solid #fff",
  objectFit: "cover"
};

const soundBtnStyle = {
  position: "fixed",
  bottom: "80px",
  right: "20px", // ✅ الطرف اليمين
  zIndex: 9999,
  background: "#000",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  padding: "8px 14px",
  fontSize: "14px",
  cursor: "pointer",
  boxShadow: "0 0 10px rgba(0,0,0,0.3)"
};




const iconImageStyle = {
  width: "32px",
  height: "32px",
  objectFit: "contain",
  display: "block",
};



const footerStyle = {
  position: "fixed",
  bottom: "0",
  left: "0",
  width: "100%",
  height: "60px",
  background: "#111",
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center",
  padding: "0 10px",
  zIndex: 1000,
  borderTop: "1px solid #333",
};


const footerBtn = {
  background: "none",
  border: "none",
  color: "#fff",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  fontSize: "10px",
  padding: "2px",
  width: "50px",
};


const footerIcon = {
  width: "24px",
  height: "24px",
  marginBottom: "2px",
  objectFit: "contain"
};



export default TiktokViewer;
