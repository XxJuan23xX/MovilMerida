import { useState, useEffect } from "react";
import TrafficMap from "./components/TrafficMap";
import HeatmapView from "./components/HeatmapView";
import {
  Car,
  Map as MapIcon,
  Flame,
  Menu,
  Moon,
  Sun,
  Activity,
  Clock,
  ShieldAlert,
} from "lucide-react";

function App() {
  const [activeTab, setActiveTab] = useState("tramos"); // 'tramos' o 'calor'
  const [isExpanded, setIsExpanded] = useState(true); // Estado para expandir/contraer el panel derecho del sidebar
  const [simulationMode, setSimulationMode] = useState("realtime"); // 'realtime' o 'historical'
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("movilmerida_theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Sincronizar clase 'dark' con la etiqueta html para Tailwind
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("movilmerida_theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("movilmerida_theme", "light");
    }
  }, [darkMode]);

  return (
    <div
      className={`fixed inset-0 w-screen h-screen overflow-hidden bg-gray-100 dark:bg-gray-950 ${darkMode ? "dark" : ""}`}
    >
      {/* 1. MAPA DE FONDO (Ocupa exactamente el 100% de la ventana) */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
        {activeTab === "tramos" ? (
          <TrafficMap simulationMode={simulationMode} />
        ) : (
          <HeatmapView />
        )}
      </div>

      {/* 2. SIDEBAR MODERNO DE DOBLE COLUMNA */}
      <aside className="absolute inset-y-0 left-0 h-screen z-30 flex shadow-2xl pointer-events-none">
        {/* Columna Izquierda: Iconos fijos (Pointer events habilitados) */}
        <div className="w-20 bg-emerald-800 dark:bg-gray-900 text-white flex flex-col items-center justify-between py-6 border-r border-emerald-700/50 dark:border-gray-800 select-none h-full pointer-events-auto transition-colors duration-300">
          {/* Logo Superior */}
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white dark:bg-emerald-800 p-2.5 rounded-2xl shadow-md text-emerald-900">
              <Car size={24} />
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2.5 rounded-xl hover:bg-emerald-700/60 dark:hover:bg-gray-800 text-emerald-200 transition-colors"
              title="Expandir / Contraer Menú"
            >
              <Menu size={22} />
            </button>
          </div>

          {/* Iconos de Navegación Rápida Centrales */}
          <div className="flex flex-col space-y-3">
            <button
              onClick={() => {
                setActiveTab("tramos");
                setIsExpanded(true);
              }}
              className={`p-3 rounded-2xl transition-all ${
                activeTab === "tramos" && isExpanded
                  ? "bg-white text-emerald-900 shadow-lg"
                  : "text-emerald-200 hover:bg-emerald-700/50 dark:hover:bg-gray-800"
              }`}
              title="Mapa de Tramos"
            >
              <MapIcon size={20} />
            </button>
            <button
              onClick={() => {
                setActiveTab("calor");
                setIsExpanded(true);
              }}
              className={`p-3 rounded-2xl transition-all ${
                activeTab === "calor" && isExpanded
                  ? "bg-white text-emerald-900 shadow-lg"
                  : "text-emerald-200 hover:bg-emerald-700/50 dark:hover:bg-gray-800"
              }`}
              title="Mapa de Calor"
            >
              <Flame size={20} />
            </button>
          </div>

          {/* Controles Inferiores (Tema) */}
          <div className="flex flex-col items-center space-y-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-2xl bg-emerald-900/60 dark:bg-gray-800 text-emerald-200 dark:text-amber-400 border border-emerald-700/40 dark:border-gray-700 transition-colors shadow-sm"
              title="Cambiar Tema"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        {/* Columna Derecha: Panel Extensible con efecto fluido de izquierda a derecha */}
        <div
          className={`h-full bg-emerald-700 dark:bg-gray-900/95 backdrop-blur-md text-white flex flex-col transition-all duration-300 ease-in-out overflow-hidden pointer-events-auto ${
            isExpanded
              ? "w-72 opacity-100 border-r border-emerald-600/30 dark:border-gray-800 shadow-2xl"
              : "w-0 opacity-0 border-none"
          }`}
        >
          {/* Contenedor interno con ancho fijo para evitar deformación de texto durante la transición */}
          <div className="w-72 h-full flex flex-col justify-between p-5 overflow-y-auto">
            {/* Parte Superior del Panel */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-emerald-600/40 dark:border-gray-800">
                <div>
                  <span className="text-xs uppercase tracking-wider text-emerald-200 dark:text-emerald-400 font-semibold">
                    Sistema Urbano
                  </span>
                  <h3 className="text-xl font-extrabold tracking-tight text-white mt-0.5">
                    MovilMerida
                  </h3>
                </div>
              </div>

              {/* Opciones de Navegación Principal */}
              <div className="mt-6 space-y-3">
                <p className="text-xs font-semibold text-emerald-200 dark:text-emerald-400 uppercase tracking-wider px-1">
                  Capas y Visualización
                </p>

                <div className="space-y-2 mt-2">
                  <button
                    onClick={() => setActiveTab("tramos")}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl font-medium text-sm transition-all ${
                      activeTab === "tramos"
                        ? "bg-white text-emerald-900 shadow-md font-semibold"
                        : "text-emerald-100 dark:text-gray-300 hover:bg-emerald-600/40 dark:hover:bg-gray-800"
                    }`}
                  >
                    <MapIcon size={18} />
                    <span>Mapa de Tramos</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("calor")}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl font-medium text-sm transition-all ${
                      activeTab === "calor"
                        ? "bg-white text-emerald-900 shadow-md font-semibold"
                        : "text-emerald-100 dark:text-gray-300 hover:bg-emerald-600/40 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Flame size={18} />
                    <span>Mapa de Calor</span>
                  </button>
                </div>
              </div>

              {/* Métricas del Sistema (Big Data) */}
              <div className="mt-8 space-y-3">
                <p className="text-xs font-semibold text-emerald-200 dark:text-emerald-400 uppercase tracking-wider px-1">
                  Métricas del Sistema
                </p>

                <div className="space-y-2.5 mt-2">
                  <div className="bg-emerald-800/50 dark:bg-gray-800/60 p-3 rounded-2xl border border-emerald-600/30 dark:border-gray-700 flex items-center space-x-3 shadow-sm">
                    <div className="bg-emerald-600/40 dark:bg-emerald-900/50 p-2 rounded-xl text-emerald-200 dark:text-emerald-400">
                      <Activity size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] text-emerald-200 dark:text-gray-400">
                        Cobertura
                      </p>
                      <p className="text-xs font-bold text-white">
                        Mérida + Periférico
                      </p>
                    </div>
                  </div>

                  <div className="bg-emerald-800/50 dark:bg-gray-800/60 p-3 rounded-2xl border border-emerald-600/30 dark:border-gray-700 flex items-center space-x-3 shadow-sm">
                    <div className="bg-amber-600/40 dark:bg-amber-900/50 p-2 rounded-xl text-amber-200 dark:text-amber-400">
                      <Clock size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] text-emerald-200 dark:text-gray-400">
                        Horas Pico
                      </p>
                      <p className="text-xs font-bold text-white">
                        7-9 AM | 1-3 PM | 6-8 PM
                      </p>
                    </div>
                  </div>

                  <div className="bg-emerald-800/50 dark:bg-gray-800/60 p-3 rounded-2xl border border-emerald-600/30 dark:border-gray-700 flex items-center space-x-3 shadow-sm">
                    <div className="bg-rose-600/40 dark:bg-rose-900/50 p-2 rounded-xl text-rose-200 dark:text-rose-400">
                      <ShieldAlert size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] text-emerald-200 dark:text-gray-400">
                        Base de Datos
                      </p>
                      <p className="text-xs font-bold text-white">
                        MongoDB (2dsphere)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjeta Inferior: Selector de Modo (Tiempo Real / Histórico) */}
            <div className="p-3 bg-emerald-800/70 dark:bg-gray-800/80 rounded-2xl border border-emerald-600/40 dark:border-gray-700 text-center space-y-2 mt-6 shadow-sm">
              <p className="text-[11px] font-medium text-emerald-200 dark:text-gray-300 tracking-wide">
                Proyecto de Big Data Urbano
              </p>
              <div className="grid grid-cols-2 gap-1.5 mt-2 bg-emerald-900/50 dark:bg-gray-900 p-1 rounded-xl">
                <button
                  onClick={() => setSimulationMode("realtime")}
                  className={`py-2 px-1 text-[11px] font-bold rounded-lg transition-all ${
                    simulationMode === "realtime"
                      ? "bg-white text-emerald-900 shadow-md"
                      : "text-emerald-200 hover:text-white hover:bg-emerald-700/50"
                  }`}
                >
                  Tiempo Real
                </button>
                <button
                  onClick={() => setSimulationMode("historical")}
                  className={`py-2 px-1 text-[11px] font-bold rounded-lg transition-all ${
                    simulationMode === "historical"
                      ? "bg-white text-emerald-900 shadow-md"
                      : "text-emerald-200 hover:text-white hover:bg-emerald-700/50"
                  }`}
                >
                  Modo Histórico
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default App;
