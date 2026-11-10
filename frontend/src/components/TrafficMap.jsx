import { useEffect, useState, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import maplibreglWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import axios from "axios";
import { Search, X, SlidersHorizontal, Clock, Antenna } from "lucide-react";
import trafficImage from "../assets/traffic.png";

if (typeof maplibregl.setWorkerUrl === "function") {
  maplibregl.setWorkerUrl(maplibreglWorkerUrl);
}

const TrafficMap = ({ simulationMode = "realtime", setSimulationMode }) => {
  const [records, setRecords] = useState([]);
  const [historicalData, setHistoricalData] = useState(null);
  const [selectedHistoricalKey, setSelectedHistoricalKey] =
    useState("hourCurrent"); // 'hourMinus2', 'hourMinus1', 'hourCurrent'
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Estado con la hora y nivel activo proveniente de la simulación del backend
  const [trafficInfo, setTrafficInfo] = useState({
    hour: null,
    level: "moderado",
    timeStr: "",
  });

  // Reloj local en tiempo real para Mérida: hora numérica, minutos con 2 dígitos y AM/PM
  const getMeridaFormattedTime = () => {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Merida",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());
  };

  const [currentTimeStr, setCurrentTimeStr] = useState(getMeridaFormattedTime);

  // Sincronización continua en vivo cada 3 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeStr(getMeridaFormattedTime());
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Estados para búsqueda, filtros y el menú flotante en móvil
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevels, setSelectedLevels] = useState({
    bajo: true,
    moderado: true,
    alto: true,
    severo: true,
  });
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);

  const meridaCenter = [-89.5926, 20.9674];

  const formatLevel = (level) => {
    const map = {
      bajo: "Tráfico Fluido",
      moderado: "Tráfico Moderado",
      alto: "Tráfico Alto",
      severo: "Tráfico Severo",
    };
    return (
      map[level?.toLowerCase()] ||
      `Tráfico ${level ? level.charAt(0).toUpperCase() + level.slice(1) : "Moderado"}`
    );
  };

  const getBadgeLevelStyle = (level) => {
    switch (level?.toLowerCase()) {
      case "bajo":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/50 dark:border-emerald-700/50";
      case "moderado":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/50 dark:border-amber-700/50";
      case "alto":
        return "bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 border border-orange-300/50 dark:border-orange-700/50";
      case "severo":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300/50 dark:border-rose-700/50";
      default:
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/50 dark:border-emerald-700/50";
    }
  };

  // 1. Obtener datos de la API (Tiempo real e Histórico)
  useEffect(() => {
    const fetchTrafficData = async () => {
      try {
        const response = await axios.get(
          "https://movilmerida.onrender.com/api/traffic/heatmap",
        );
        if (response.data.success) {
          setRecords(response.data.data);
          setHistoricalData(response.data.historical);
          setTrafficInfo({
            hour:
              response.data.meridaLocalHour !== undefined
                ? response.data.meridaLocalHour
                : null,
            level: response.data.activeSimulationRule || "moderado",
          });
        }
      } catch (error) {
        console.error("Error al obtener datos de tráfico:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrafficData();
    const interval = setInterval(fetchTrafficData, 60000);
    return () => clearInterval(interval);
  }, []);

  // 2. Inicializar el mapa
  useEffect(() => {
    if (map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style:
        "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json?key=cb1_53ou_1_5f971142c7d5b6d8c87dbb2c",
      center: meridaCenter,
      zoom: 12,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    const onMapReady = () => {
      setMapLoaded(true);
      if (map.current) {
        map.current.resize();
      }
    };

    if (map.current.loaded()) {
      onMapReady();
    } else {
      map.current.once("load", onMapReady);
    }

    const handleResize = () => {
      if (map.current) {
        map.current.resize();
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  const getCongestionColor = (level) => {
    switch (level) {
      case "bajo":
        return "#22c55e"; // Verde
      case "moderado":
        return "#eab308"; // Amarillo
      case "alto":
        return "#f97316"; // Naranja
      case "severo":
        return "#ef4444"; // Rojo
      default:
        return "#3b82f6";
    }
  };

  const toggleLevelFilter = (level) => {
    setSelectedLevels((prev) => ({
      ...prev,
      [level]: !prev[level],
    }));
  };

  // Determinar qué registros mostrar según el modo activo (Tiempo Real vs Histórico)
  const getCurrentActiveRecords = () => {
    if (
      simulationMode === "historical" &&
      historicalData &&
      historicalData[selectedHistoricalKey]
    ) {
      return historicalData[selectedHistoricalKey].data;
    }
    return records;
  };

  // Obtener la etiqueta de hora a mostrar en el badge superior
  const getDisplayTimeAndLevel = () => {
    if (
      simulationMode === "historical" &&
      historicalData &&
      historicalData[selectedHistoricalKey]
    ) {
      const histItem = historicalData[selectedHistoricalKey];
      // Calcular nivel general estimado o usar el promedio de los registros
      return {
        timeText: `${histItem.hour}:00 hrs (Histórico)`,
        level: trafficInfo.level,
      };
    }
    return {
      timeText: `${currentTimeStr}`,
      level: trafficInfo.level,
    };
  };

  const currentDisplay = getDisplayTimeAndLevel();

  // 3. Pintar y filtrar marcadores
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const activeRecords = getCurrentActiveRecords();
    if (!activeRecords || activeRecords.length === 0) return;

    const filteredRecords = activeRecords.filter((item) => {
      const streetName = (item.street || "").toLowerCase();
      const matchesSearch = streetName.includes(searchTerm.toLowerCase());
      const matchesLevel = selectedLevels[item.congestion];
      return matchesSearch && matchesLevel;
    });

    filteredRecords.forEach((item) => {
      const el = document.createElement("div");
      el.className = "cursor-pointer";

      const inner = document.createElement("div");
      inner.className =
        "w-7 h-7 rounded-full border-2 border-white shadow-xl flex items-center justify-center font-bold text-white text-[10px] transition-transform duration-200 hover:scale-125";
      inner.style.backgroundColor = getCongestionColor(item.congestion);

      el.appendChild(inner);

      const popupHtml = `
        <div style="position: relative; background-color: #e5e7eb; padding: 14px 18px 14px 14px; border-radius: 18px; font-family: system-ui, sans-serif; width: 270px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 14px; position: relative;">
        <button onclick="this.closest('.maplibregl-popup').remove()" style="position: absolute; top: 9px; right: 8px; width: 22px; height: 22px; border-radius: 9999px; background-color: rgba(0,0,0,0.1); color: #374151; display: flex; align-items: center; justify-content: center; font-size: 13px; border: none; outline: none; cursor: pointer;">
            &times;
          </button>
          <img src="${trafficImage}" alt="Tráfico" style="width: 80px; height: auto; object-fit: contain; flex-shrink: 0;" />
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #1f2937; line-height: 1.3; width: 100%;">
            <div><strong style="color: #374151;">Zona:</strong><br/>${item.street ? "Sector " + item.street : "Zona Urbana General"}</div>
            <div style="margin-top: 2px;"><strong style="color: #374151;">Velocidad:</strong> ${item.speed ?? "N/A"} km/h</div>
            <div style="margin-top: 2px;"><strong style="color: #374151;">Nivel:</strong> <span style="text-transform: capitalize; font-weight: 600;">${item.congestion}</span></div>
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({
        className: "custom-traffic-popup",
        offset: 18,
        closeButton: true,
        closeOnClick: true,
      }).setHTML(popupHtml);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([item.lng, item.lat])
        .setPopup(popup)
        .addTo(map.current);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const isCurrentlyOpen = popup.isOpen();

        // Cerrar cualquier otro popup que esté abierto
        markersRef.current.forEach((m) => {
          const p = m.getPopup();
          if (p && p.isOpen()) {
            p.remove();
          }
        });

        if (!isCurrentlyOpen) {
          marker.togglePopup();
        }
      });

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [
    records,
    historicalData,
    simulationMode,
    selectedHistoricalKey,
    mapLoaded,
    searchTerm,
    selectedLevels,
  ]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 4. BARRA SUPERIOR FLOTANTE (Visible solo en Tablets y PC 'md+') */}
      <div className="absolute top-4 left-24 sm:left-28 z-20 hidden md:flex items-center space-x-3 overflow-x-auto py-1 px-1 pointer-events-auto no-scrollbar max-w-[calc(100vw-480px)]">
        {/* Input de Búsqueda */}
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-lg border border-gray-200/70 dark:border-gray-700/70 rounded-full flex items-center px-4 py-2 w-80 flex-shrink-0 transition-colors duration-300">
          <Search size={18} className="text-gray-400 mr-2 flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar calle o zona en Mérida..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-sm text-gray-800 dark:text-gray-100 focus:outline-none placeholder-gray-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-1"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="h-6 w-[1px] bg-gray-300 dark:bg-gray-700 flex-shrink-0"></div>

        {/* Píldoras de Filtro por Congestión */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={() => toggleLevelFilter("bajo")}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-full text-xs font-semibold shadow-md transition-all duration-200 backdrop-blur-md ${
              selectedLevels.bajo
                ? "bg-emerald-500 text-white shadow-emerald-500/20"
                : "bg-white/90 dark:bg-gray-900/90 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
            <span>Fluido / Bajo</span>
          </button>

          <button
            onClick={() => toggleLevelFilter("moderado")}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-full text-xs font-semibold shadow-md transition-all duration-200 backdrop-blur-md ${
              selectedLevels.moderado
                ? "bg-amber-500 text-white shadow-amber-500/20"
                : "bg-white/90 dark:bg-gray-900/90 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-200"></span>
            <span>Moderado</span>
          </button>

          <button
            onClick={() => toggleLevelFilter("alto")}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-full text-xs font-semibold shadow-md transition-all duration-200 backdrop-blur-md ${
              selectedLevels.alto
                ? "bg-orange-500 text-white shadow-orange-500/20"
                : "bg-white/90 dark:bg-gray-900/90 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-orange-200"></span>
            <span>Alto</span>
          </button>

          <button
            onClick={() => toggleLevelFilter("severo")}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-full text-xs font-semibold shadow-md transition-all duration-200 backdrop-blur-md ${
              selectedLevels.severo
                ? "bg-red-500 text-white shadow-red-500/20"
                : "bg-white/90 dark:bg-gray-900/90 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-200"></span>
            <span>Severo</span>
          </button>
        </div>
      </div>

      {/* 5. BARRA DE REPRODUCCIÓN INFERIOR (Solo aparece en Modo Histórico) */}
      {simulationMode === "historical" && historicalData && (
        <div className="absolute bottom-20 md:bottom-6 left-16 sm:left-20 right-3 sm:right-auto md:left-1/2 md:right-auto md:-translate-x-1/2 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-3 py-2 sm:px-5 sm:py-3 rounded-2xl shadow-2xl border border-emerald-500/30 flex items-center space-x-2 sm:space-x-4 pointer-events-auto animate-fade-in overflow-x-auto no-scrollbar">
          <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 flex-shrink-0">
            <Clock size={16} />
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider hidden sm:inline">
              Evolución (Últimas 3 Horas):
            </span>
          </div>
          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
            <button
              onClick={() => setSelectedHistoricalKey("hourMinus2")}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                selectedHistoricalKey === "hourMinus2"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              }`}
            >
              {historicalData.hourMinus2.label}
            </button>
            <button
              onClick={() => setSelectedHistoricalKey("hourMinus1")}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                selectedHistoricalKey === "hourMinus1"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              }`}
            >
              {historicalData.hourMinus1.label}
            </button>
            <button
              onClick={() => setSelectedHistoricalKey("hourCurrent")}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                selectedHistoricalKey === "hourCurrent"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              }`}
            >
              {historicalData.hourCurrent.label}
            </button>
          </div>
        </div>
      )}

      {/* 6. BOTONES FLOTANTES MÓVILES (Inferior Izquierda): Modo Simulación y Filtros */}
      <div className="absolute bottom-20 left-3.5 z-30 md:hidden pointer-events-auto flex flex-col space-y-2.5">
        {/* Botón superior: Alternar Modo Histórico / En Vivo */}
        <button
          onClick={() => {
            if (typeof setSimulationMode === "function") {
              setSimulationMode((prev) =>
                prev === "realtime" ? "historical" : "realtime",
              );
            }
          }}
          className={`p-3 rounded-full shadow-2xl flex items-center justify-center border-2 border-white/20 transition-all active:scale-95 cursor-pointer ${
            simulationMode === "historical"
              ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30"
              : "bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/30"
          }`}
          title={
            simulationMode === "historical"
              ? "Modo Histórico (Clic para cambiar a Tiempo Real)"
              : "Modo Tiempo Real (Clic para cambiar a Histórico)"
          }
        >
          {simulationMode === "historical" ? (
            <Antenna size={20} className="animate-pulse" />
          ) : (
            <Clock size={20} />
          )}
        </button>

        {/* Botón inferior: Desplegar filtros */}
        <button
          onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
          className="bg-emerald-700 hover:bg-emerald-800 text-white p-3 rounded-full shadow-2xl flex items-center justify-center border-2 border-white/20 transition-transform active:scale-95 cursor-pointer"
          title="Filtrar Tráfico y Buscar"
        >
          <SlidersHorizontal size={20} />
        </button>
      </div>

      {/* MODAL / PANEL DESPLEGABLE MÓVIL */}
      {isMobileFiltersOpen && (
        <div className="absolute left-4 right-4 bottom-24 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg p-5 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col space-y-4 md:hidden pointer-events-auto animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-emerald-600" />
              Filtros de Tráfico
            </h3>
            <button
              onClick={() => setIsMobileFiltersOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1"
            >
              <X size={20} />
            </button>
          </div>

          {/* Buscador en Móvil */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center px-3 py-2.5 border border-gray-200 dark:border-gray-700">
            <Search size={16} className="text-gray-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar calle o zona..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-xs text-gray-800 dark:text-gray-100 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-gray-400"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtros de Congestión en Móvil */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Nivel de Congestión
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => toggleLevelFilter("bajo")}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                  selectedLevels.bajo
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
                <span>Fluido / Bajo</span>
              </button>

              <button
                onClick={() => toggleLevelFilter("moderado")}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                  selectedLevels.moderado
                    ? "bg-amber-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-200"></span>
                <span>Moderado</span>
              </button>

              <button
                onClick={() => toggleLevelFilter("alto")}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                  selectedLevels.alto
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-orange-200"></span>
                <span>Alto</span>
              </button>

              <button
                onClick={() => toggleLevelFilter("severo")}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                  selectedLevels.severo
                    ? "bg-red-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-200"></span>
                <span>Severo</span>
              </button>
            </div>
          </div>

          {/* Badge Informativo integrado dentro del panel móvil */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex items-center justify-center">
            <span
              className={`text-[11px] sm:text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 transition-colors duration-300 ${getBadgeLevelStyle(currentDisplay.level)}`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
                style={{
                  backgroundColor: getCongestionColor(currentDisplay.level),
                }}
              />
              Mérida y Periférico • {currentDisplay.timeText} (
              {formatLevel(currentDisplay.level)})
            </span>
          </div>
        </div>
      )}

      {/* 7. BADGE INFORMATIVO PRINCIPAL (PC y Móvil) */}
      <div className="absolute top-4 right-14 sm:right-20 z-10 flex bg-white/95 dark:bg-gray-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-700/60 items-center space-x-2 pointer-events-auto transition-colors duration-300 max-w-fit">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse"
          style={{ backgroundColor: getCongestionColor(currentDisplay.level) }}
        />
        <span
          className={`text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full transition-colors duration-300 ${getBadgeLevelStyle(currentDisplay.level)}`}
        >
          {simulationMode === "historical" ? "Modo Histórico • " : ""}Mérida y
          Periférico • {currentDisplay.timeText} (
          {formatLevel(currentDisplay.level)})
        </span>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 dark:bg-gray-950/80 text-gray-500 dark:text-gray-400 z-30 backdrop-blur-xs">
          Cargando nodos de tráfico...
        </div>
      )}

      {/* Contenedor del mapa */}
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};

export default TrafficMap;
