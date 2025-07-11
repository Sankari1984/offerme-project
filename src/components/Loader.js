// Loader.js
import React from "react";

const Loader = () => {
  return (
    <div
      id="loader"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "black",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <img
        src="/static/img/intro.gif"
        alt="جار التحميل..."
        style={{
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
        }}
      />
    </div>
  );
};

export default Loader;
