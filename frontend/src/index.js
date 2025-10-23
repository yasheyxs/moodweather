import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import favicon from "./Weather_iOS_15.png";

const ensureFavicon = () => {
  if (typeof document === "undefined") return;
  const existing = document.querySelector("link[rel*='icon']");
  const link = existing || document.createElement("link");
  link.rel = "icon";
  link.type = "image/png";
  link.href = favicon;
  if (!existing) {
    document.head.appendChild(link);
  }
};

ensureFavicon();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
