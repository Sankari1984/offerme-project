// App.js
import React from "react";
import WelcomeBanner from "./components/WelcomeBanner";
import TiktokViewer from "./components/TiktokViewer"; // ❌ لا تستورد Loader هنا

function App() {
  return (
    <>
      <WelcomeBanner />
      <TiktokViewer />
    </>
  );
}

export default App;
