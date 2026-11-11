import { useEffect, useState, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import maplibreglWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import axios from "axios";
import {
  Search,
  X,
  SlidersHorizontal,
  Clock,
  Antenna,
  LocateFixed,
} from "lucide-react";
import trafficImage from "../assets/traffic.png";

if (typeof maplibregl.setWorkerUrl === "function") {
  maplibregl.setWorkerUrl(maplibreglWorkerUrl);
}

// Nodos viales de Mérida respaldados para navegación sin conexión
const FALLBACK_TRAFFIC_RECORDS = [
  {
    _id: "f1",
    lat: 20.97465,
    lng: -89.64026,
    street: "Av. Itzáes (Frente al O'Horán)",
    speed: 25,
    congestion: "alto",
  },
  {
    _id: "f2",
    lat: 21.02319,
    lng: -89.62094,
    street: "Prolongación Montejo x Periférico Norte",
    speed: 35,
    congestion: "alto",
  },
  {
    _id: "f3",
    lat: 21.03574,
    lng: -89.62304,
    street: "Calle 60 Norte (Zona Gran Plaza)",
    speed: 45,
    congestion: "moderado",
  },
  {
    _id: "f4",
    lat: 21.02702,
    lng: -89.57172,
    street: "Anillo Periférico Norte (Zona Altabrisa)",
    speed: 75,
    congestion: "bajo",
  },
  {
    _id: "f5",
    lat: 21.0364,
    lng: -89.60265,
    street: "Avenida García Lavín x Periférico",
    speed: 50,
    congestion: "bajo",
  },
  {
    _id: "f6",
    lat: 20.9522,
    lng: -89.56834,
    street: "Anillo Periférico Sur (Kanasín)",
    speed: 28,
    congestion: "alto",
  },
  {
    _id: "f7",
    lat: 20.99525,
    lng: -89.67328,
    street: "Anillo Periférico Poniente (Caucel)",
    speed: 65,
    congestion: "bajo",
  },
  {
    _id: "f8",
    lat: 20.98707,
    lng: -89.65953,
    street: "Avenida Jacinto Canek",
    speed: 40,
    congestion: "moderado",
  },
  {
    _id: "f9",
    lat: 20.98996,
    lng: -89.61687,
    street: "Glorieta de Prolongación Montejo",
    speed: 18,
    congestion: "severo",
  },
  {
    _id: "f10",
    lat: 20.99887,
    lng: -89.61592,
    street: "Glorieta de la Paz",
    speed: 30,
    congestion: "moderado",
  },
  {
    _id: "f11",
    lat: 20.96838,
    lng: -89.62213,
    street: "Centro Histórico",
    speed: 15,
    congestion: "severo",
  },
  {
    _id: "f12",
    lat: 20.94356,
    lng: -89.65794,
    street: "Avenida Aviación (Rumbo al Aeropuerto)",
    speed: 55,
    congestion: "bajo",
  },
  {
    _id: "f13",
    lat: 20.92845,
    lng: -89.68079,
    street: "Carretera Mérida - Umán",
    speed: 35,
    congestion: "alto",
  },
  {
    _id: "f14",
    lat: 20.96509,
    lng: -89.58824,
    street: "Calle 59 x Circuito Colonias",
    speed: 40,
    congestion: "moderado",
  },
  {
    _id: "f15",
    lat: 20.91186,
    lng: -89.62034,
    street: "Anillo Periférico Sur",
    speed: 60,
    congestion: "bajo",
  },
  {
    _id: "f16",
    lat: 20.93849,
    lng: -89.61577,
    street: "Universidad Tecnológica Metropolitana (UTM)",
    speed: 40,
    congestion: "moderado",
  },
  {
    _id: "f17",
    lat: 20.94324,
    lng: -89.63001,
    street: "Villa Palmira",
    speed: 65,
    congestion: "bajo",
  },
  {
    _id: "f18",
    lat: 20.98239,
    lng: -89.64605,
    street: "Unidad Deportiva Inalámbrica",
    speed: 65,
    congestion: "bajo",
  },
  {
    _id: "f19",
    lat: 20.98374,
    lng: -89.67107,
    street: "Parque Extremo",
    speed: 65,
    congestion: "bajo",
  },
];

const FALLBACK_HISTORICAL = {
  hourMinus2: {
    hour: 12,
    label: "12:00 hrs",
    data: FALLBACK_TRAFFIC_RECORDS.map((r) => ({
      ...r,
      speed: r.congestion === "severo" ? 18 : r.speed,
    })),
  },
  hourMinus1: {
    hour: 13,
    label: "13:00 hrs",
    data: FALLBACK_TRAFFIC_RECORDS.map((r) => ({
      ...r,
      speed: r.congestion === "severo" ? 20 : r.speed,
    })),
  },
  hourCurrent: {
    hour: 14,
    label: "14:00 hrs (Caché)",
    data: FALLBACK_TRAFFIC_RECORDS,
  },
};

const TrafficMap = ({ simulationMode = "realtime", setSimulationMode }) => {
  // Inicialización sincrónica desde localStorage para renderizado inmediato incluso sin internet
  const [records, setRecords] = useState(() => {
    try {
      const saved = localStorage.getItem("cached_traffic_records");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Lectura de caché local de records:", e);
    }
    return FALLBACK_TRAFFIC_RECORDS;
  });

  const [historicalData, setHistoricalData] = useState(() => {
    try {
      const saved = localStorage.getItem("cached_traffic_historical");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch (e) {
      console.warn("Lectura de caché local de histórico:", e);
    }
    return FALLBACK_HISTORICAL;
  });

  const [selectedHistoricalKey, setSelectedHistoricalKey] =
    useState("hourCurrent"); // 'hourMinus2', 'hourMinus1', 'hourCurrent'

  const [loading, setLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [userLocation, setUserLocation] = useState(null); // Coordenadas del usuario [lat, lng]
  const [isLocating, setIsLocating] = useState(false);
  const userMarkerRef = useRef(null);

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert("Tu dispositivo o navegador no soporta geolocalización.");
      return;
    }

    setIsLocating(true);

    const onLocationSuccess = (position) => {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      setIsLocating(false);
      setUserLocation({ lat: userLat, lng: userLng });

      // Centrar y volar suavemente a la ubicación del usuario
      if (map.current) {
        map.current.flyTo({
          center: [userLng, userLat],
          zoom: 16, // Zoom detallado para ver calles de Mérida
          essential: true,
        });
      }
    };

    const onLocationError = (error) => {
      // Si falla o agota el tiempo con satélite GPS (común bajo techo en iPhone o Android),
      // reintentamos automáticamente con precisión estándar (antenas/Wi-Fi)
      if (
        error.code === error.TIMEOUT ||
        error.code === error.POSITION_UNAVAILABLE
      ) {
        navigator.geolocation.getCurrentPosition(
          onLocationSuccess,
          (fallbackErr) => {
            setIsLocating(false);
            console.error("Error geolocalización fallback:", fallbackErr);
            alert(
              "No se pudo determinar tu ubicación. Asegúrate de tener el GPS activado en los ajustes de tu celular.",
            );
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
        );
      } else {
        setIsLocating(false);
        console.error("Error al obtener la ubicación:", error);
        if (error.code === error.PERMISSION_DENIED) {
          alert(
            "Permiso de ubicación denegado. Permite el acceso a tu ubicación en los ajustes del navegador de tu teléfono.",
          );
        } else {
          alert(
            "No se pudo obtener tu ubicación. Verifica que el GPS de tu celular esté encendido.",
          );
        }
      }
    };

    // Intento 1: Alta precisión con timeout de 8 segundos
    navigator.geolocation.getCurrentPosition(
      onLocationSuccess,
      onLocationError,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 },
    );
  };
  // Estado con la hora y nivel activo proveniente de la simulación del backend
  const [trafficInfo, setTrafficInfo] = useState(() => {
    try {
      const saved = localStorage.getItem("cached_traffic_info");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch (e) {
      console.warn("Lectura de caché local de trafficInfo:", e);
    }
    return {
      hour: null,
      level: "moderado",
      timeStr: "",
    };
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

  // Detección en tiempo real del estado de conexión a internet
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 1. Obtener datos de la API (Tiempo real e Histórico)
  useEffect(() => {
    const fetchTrafficData = async () => {
      // Si el navegador ya sabe que no hay conexión, evitamos timeout y usamos caché
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setIsOnline(false);
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          "https://movilmerida.onrender.com/api/traffic/heatmap",
          { timeout: 4000 },
        );
        if (response.data.success) {
          setIsOnline(true);
          const fetchedRecords = response.data.data;
          const fetchedHistorical = response.data.historical;
          const fetchedInfo = {
            hour:
              response.data.meridaLocalHour !== undefined
                ? response.data.meridaLocalHour
                : null,
            level: response.data.activeSimulationRule || "moderado",
          };

          // Actualizamos estados con datos frescos de la red
          setRecords(fetchedRecords);
          setHistoricalData(fetchedHistorical);
          setTrafficInfo(fetchedInfo);

          // 💡 RESPALDO EN LOCALSTORAGE PARA MODO OFFLINE
          try {
            localStorage.setItem(
              "cached_traffic_records",
              JSON.stringify(fetchedRecords),
            );
            localStorage.setItem(
              "cached_traffic_historical",
              JSON.stringify(fetchedHistorical),
            );
            localStorage.setItem(
              "cached_traffic_info",
              JSON.stringify(fetchedInfo),
            );
          } catch (storageErr) {
            console.warn("Error guardando en localStorage:", storageErr);
          }
        }
      } catch (error) {
        setIsOnline(false);
        console.warn(
          "Sin conexión con el servidor o timeout, usando datos respaldados localmente...",
          error,
        );

        // 🔄 RECUPERAR DATOS DEL CACHÉ LOCAL CUANDO NO HAYA INTERNET
        try {
          const savedRecords = localStorage.getItem("cached_traffic_records");
          const savedHistorical = localStorage.getItem(
            "cached_traffic_historical",
          );
          const savedInfo = localStorage.getItem("cached_traffic_info");

          if (savedRecords) {
            const parsed = JSON.parse(savedRecords);
            if (Array.isArray(parsed) && parsed.length > 0) setRecords(parsed);
          }
          if (savedHistorical) {
            const parsed = JSON.parse(savedHistorical);
            if (parsed) setHistoricalData(parsed);
          }
          if (savedInfo) {
            const parsed = JSON.parse(savedInfo);
            if (parsed) setTrafficInfo(parsed);
          }
        } catch (storageReadErr) {
          console.warn("Error recuperando caché local:", storageReadErr);
        }
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

    // Fallback de seguridad: si al estar offline el evento 'load' tarda por recursos externos,
    // garantizamos que los marcadores de tráfico se monten de inmediato
    const fallbackTimer = setTimeout(() => {
      setMapLoaded(true);
    }, 1200);

    const handleResize = () => {
      if (map.current) {
        map.current.resize();
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(fallbackTimer);
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

  // 4. Dibujar / Actualizar marcador azul de la ubicación del usuario (GPS)
  useEffect(() => {
    if (!map.current || !mapLoaded || !userLocation) return;

    // Si ya existe el marcador, solo actualizamos su posición suavemente
    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
      return;
    }

    // Elemento HTML personalizado para el punto azul de GPS
    const el = document.createElement("div");
    el.className = "relative flex items-center justify-center cursor-pointer";

    // Onda expansiva / pulso exterior azul
    const pulse = document.createElement("div");
    pulse.className =
      "absolute w-9 h-9 rounded-full bg-blue-500/35 animate-ping";

    // Halo azul translúcido
    const halo = document.createElement("div");
    halo.className = "absolute w-6 h-6 rounded-full bg-blue-500/40";

    // Círculo central azul sólido con borde blanco y sombra
    const core = document.createElement("div");
    core.className =
      "relative w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg";

    el.appendChild(pulse);
    el.appendChild(halo);
    el.appendChild(core);

    const userPopup = new maplibregl.Popup({
      className: "custom-traffic-popup",
      offset: 14,
      closeButton: false,
    }).setHTML(`
      <div style="background-color: #1e3a8a; color: white; padding: 6px 12px; border-radius: 12px; font-size: 11px; font-weight: 700; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-family: system-ui, sans-serif; white-space: nowrap;">
        📍 Mi ubicación actual
      </div>
    `);

    userMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(userPopup)
      .addTo(map.current);

    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    };
  }, [userLocation, mapLoaded]);

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
        <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:absolute md:bottom-6 left-16 sm:left-20 right-3 sm:right-auto md:left-1/2 md:right-auto md:-translate-x-1/2 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-3 py-2 sm:px-5 sm:py-3 rounded-2xl shadow-2xl border border-emerald-500/30 flex items-center space-x-2 sm:space-x-4 pointer-events-auto animate-fade-in overflow-x-auto no-scrollbar">
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

      {/* 2. BOTÓN FLOTANTE DE GPS (Móvil y Escritorio) */}
      <button
        onClick={handleLocateUser}
        disabled={isLocating}
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:absolute md:bottom-6 right-4 z-30 w-11 h-11 md:w-auto md:h-auto md:p-3 bg-white dark:bg-gray-900 text-slate-700 dark:text-white rounded-full md:rounded-2xl shadow-xl border border-gray-200/80 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center cursor-pointer active:scale-95"
        title="Mi Ubicación Actual (GPS)"
      >
        <LocateFixed
          size={20}
          className={`text-blue-600 dark:text-blue-400 ${
            isLocating ? "animate-spin" : ""
          }`}
        />
      </button>

      {/* 6. BOTONES FLOTANTES MÓVILES (Inferior Izquierda): Modo Simulación y Filtros */}
      <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-3.5 z-30 md:hidden pointer-events-auto flex flex-col space-y-3">
        {/* Botón superior: Alternar Modo Histórico / En Vivo */}
        <button
          onClick={() => {
            if (typeof setSimulationMode === "function") {
              setSimulationMode((prev) =>
                prev === "realtime" ? "historical" : "realtime",
              );
            }
          }}
          className={`w-11 h-11 rounded-full shadow-xl flex items-center justify-center border-2 border-white/20 transition-all active:scale-95 cursor-pointer ${
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
          className="w-11 h-11 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full shadow-xl flex items-center justify-center border-2 border-white/20 transition-transform active:scale-95 cursor-pointer shadow-emerald-700/30"
          title="Filtrar Tráfico y Buscar"
        >
          <SlidersHorizontal size={20} />
        </button>
      </div>

      {/* MODAL / PANEL DESPLEGABLE MÓVIL */}
      {isMobileFiltersOpen && (
        <div className="fixed left-4 right-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg p-5 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col space-y-4 md:hidden pointer-events-auto animate-fade-in max-h-[70dvh] overflow-y-auto">
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
          <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex items-center justify-center gap-2">
            {!isOnline && (
              <span className="text-[10px] bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full shadow-xs">
                Offline (Caché)
              </span>
            )}
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
      <div className="absolute top-3 left-3 right-14 sm:right-20 sm:left-auto sm:w-auto z-10 flex bg-white/95 dark:bg-gray-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-700/60 items-center space-x-2 pointer-events-auto transition-colors duration-300">
        {!isOnline && (
          <span className="text-[10px] bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
            Offline (Caché)
          </span>
        )}
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse"
          style={{ backgroundColor: getCongestionColor(currentDisplay.level) }}
        />
        <span
          className={`text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full transition-colors duration-300 truncate ${getBadgeLevelStyle(currentDisplay.level)}`}
        >
          {simulationMode === "historical" ? "Histórico • " : ""}Mérida y
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
