// WelcomeBanner.js
import React, { useEffect } from "react";

const WelcomeBanner = () => {
  useEffect(() => {
    const fullName = localStorage.getItem("full_name") || "زائر";
    const banner = document.getElementById("welcomeBanner");

    if (banner) {
      banner.textContent = `👋 مرحباً ${fullName}`;
      banner.style.opacity = "1";
      banner.style.transform = "translateY(0)";

      setTimeout(() => {
        banner.style.opacity = "0";
        banner.style.transform = "translateY(-100%)";
      }, 3000);
    }
  }, []);

  return (
    <div
      id="welcomeBanner"
      style={{
        textAlign: "center",
        fontSize: "16px",
        fontWeight: "500",
        color: "white",
        background: "linear-gradient(to right, #4da6ff, #2b5876)",
        padding: "6px 10px",
        borderRadius: "0 0 10px 10px",
        position: "fixed",
        top: 0,
        width: "100%",
        zIndex: 9999,
        opacity: 0,
        transform: "translateY(-100%)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      👋 مرحباً!
    </div>
  );
};

export default WelcomeBanner;
