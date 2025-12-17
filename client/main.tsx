import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./global.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

function forceLightTheme() {
  try {
    const tg = (window as any).Telegram?.WebApp;

    // Принудительно делаем цветовую схему светлой
    if (tg?.colorScheme === "dark") {
      document.documentElement.style.setProperty("--tg-theme-bg-color", "#ffffff");
      document.documentElement.style.setProperty("--tg-theme-text-color", "#000000");
      document.documentElement.style.setProperty("--tg-theme-hint-color", "#666666");
      document.documentElement.style.setProperty("--tg-theme-link-color", "#0066cc");
      document.documentElement.style.setProperty("--tg-theme-button-color", "#007bff");
      document.documentElement.style.setProperty("--tg-theme-button-text-color", "#ffffff");
      document.documentElement.style.setProperty("--tg-theme-secondary-bg-color", "#f8f8f8");
      document.documentElement.style.setProperty("--tg-theme-header-bg-color", "#ffffff");
      document.documentElement.style.setProperty("--tg-theme-accent-text-color", "#000000");
    }

    // Расширяем WebView и подписываемся на изменение темы (чтобы снова вернуть светлую)
    tg?.expand?.();
    tg?.onEvent?.("themeChanged", forceLightTheme);
  } catch (e) {
    console.warn("Theme override failed:", e);
  }
}

forceLightTheme();

createRoot(root).render(<App />);
