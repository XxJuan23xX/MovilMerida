import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Importación virtual opcional para registrar el SW gestionado por Vite PWA
import { registerSW } from "virtual:pwa-register";

// Esto registra el service worker de forma automática y maneja actualizaciones silenciosas
const updateSW = registerSW({
  onNeedRefresh() {
    if (
      confirm(
        "Hay una nueva versión de MovilMerida disponible. ¿Deseas actualizarla?",
      )
    ) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("¡La aplicación está lista para funcionar offline!");
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
