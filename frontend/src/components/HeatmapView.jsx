import { useEffect, useState, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import maplibreglWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import axios from "axios";
import trafficImage from "../assets/traffic.png";

if (typeof maplibregl.setWorkerUrl === "function") {
  maplibregl.setWorkerUrl(maplibreglWorkerUrl);
}

// Nodos viales de Mérida respaldados para navegación sin conexión
const FALLBACK_TRAFFIC_RECORDS = [
  { _id: "f1", lat: 20.97465, lng: -89.64026, street: "Av. Itzáes (Frente al O'Horán)", speed: 25, congestion: "alto" },
  { _id: "f2", lat: 21.02319, lng: -89.62094, street: "Prolongación Montejo x Periférico Norte", speed: 35, congestion: "alto" },
  { _id: "f3", lat: 21.03574, lng: -89.62304, street: "Calle 60 Norte (Zona Gran Plaza)", speed: 45, congestion: "moderado" },
  { _id: "f4", lat: 21.02702, lng: -89.57172, street: "Anillo Periférico Norte (Zona Altabrisa)", speed: 75, congestion: "bajo" },
  { _id: "f5", lat: 21.03640, lng: -89.60265, street: "Avenida García Lavín x Periférico", speed: 50, congestion: "bajo" },
  { _id: "f6", lat: 20.95220, lng: -89.56834, street: "Anillo Periférico Sur (Kanasín)", speed: 28, congestion: "alto" },
  { _id: "f7", lat: 20.99525, lng: -89.67328, street: "Anillo Periférico Poniente (Caucel)", speed: 65, congestion: "bajo" },
  { _id: "f8", lat: 20.98707, lng: -89.65953, street: "Avenida Jacinto Canek", speed: 40, congestion: "moderado" },
  { _id: "f9", lat: 20.98996, lng: -89.61687, street: "Glorieta de Prolongación Montejo", speed: 18, congestion: "severo" },
  { _id: "f10", lat: 20.99887, lng: -89.61592, street: "Glorieta de la Paz", speed: 30, congestion: "moderado" },
  { _id: "f11", lat: 20.96838, lng: -89.62213, street: "Centro Histórico", speed: 15, congestion: "severo" },
  { _id: "f12", lat: 20.94356, lng: -89.65794, street: "Avenida Aviación (Rumbo al Aeropuerto)", speed: 55, congestion: "bajo" },
  { _id: "f13", lat: 20.92845, lng: -89.68079, street: "Carretera Mérida - Umán", speed: 35, congestion: "alto" },
  { _id: "f14", lat: 20.96509, lng: -89.58824, street: "Calle 59 x Circuito Colonias", speed: 40, congestion: "moderado" },
  { _id: "f15", lat: 20.91186, lng: -89.62034, street: "Anillo Periférico Sur", speed: 60, congestion: "bajo" },
  { _id: "f16", lat: 20.93849, lng: -89.61577, street: "Universidad Tecnológica Metropolitana (UTM)", speed: 40, congestion: "moderado" },
  { _id: "f17", lat: 20.94324, lng: -89.63001, street: "Villa Palmira", speed: 65, congestion: "bajo" },
  { _id: "f18", lat: 20.98239, lng: -89.64605, street: "Unidad Deportiva Inalámbrica", speed: 65, congestion: "bajo" },
  { _id: "f19", lat: 20.98374, lng: -89.67107, street: "Parque Extremo", speed: 65, congestion: "bajo" },
];

const HeatmapView = () => {
  // Inicialización sincrónica desde localStorage para renderizado inmediato incluso sin internet
  const [trafficPoints, setTrafficPoints] = useState(() => {
    try {
      const saved = localStorage.getItem("cached_traffic_records");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Lectura de caché local en HeatmapView:", e);
    }
    return FALLBACK_TRAFFIC_RECORDS;
  });

  const [loading, setLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  const mapContainer = useRef(null);
  const map = useRef(null);
  const meridaCenter = [-89.5926, 20.9674]; // [lng, lat] para MapLibre

  // Detección en vivo del estado de conexión
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

  // 1. Obtener datos de la API
  useEffect(() => {
    const fetchHeatmapData = async () => {
      // Si el dispositivo ya sabe que está offline, evitamos intentar peticiones de red
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setIsOnline(false);
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          "https://movilmerida.onrender.com/api/traffic/heatmap",
          { timeout: 4000 }
        );
        if (response.data.success) {
          setIsOnline(true);
          const data = response.data.data;
          setTrafficPoints(data);

          // Guardar en caché para disponibilidad offline
          try {
            localStorage.setItem("cached_traffic_records", JSON.stringify(data));
          } catch (storageErr) {
            console.warn("Error guardando en localStorage desde HeatmapView:", storageErr);
          }
        }
      } catch (error) {
        setIsOnline(false);
        console.warn("Sin conexión con el servidor en HeatmapView, usando datos en caché...", error);

        try {
          const saved = localStorage.getItem("cached_traffic_records");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setTrafficPoints(parsed);
            }
          }
        } catch (storageReadErr) {
          console.warn("Error leyendo de localStorage en HeatmapView:", storageReadErr);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchHeatmapData();
    const interval = setInterval(fetchHeatmapData, 60000);
    return () => clearInterval(interval);
  }, []);

  // 2. Inicializar el mapa con MapLibre GL
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
    // activamos mapLoaded para renderizar la capa térmica en cuanto el estilo esté listo
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

  // 3. Agregar los puntos de calor / círculos de densidad cuando el mapa cargue
  useEffect(() => {
    if (!map.current || !mapLoaded || trafficPoints.length === 0) return;

    const renderHeatmapLayers = () => {
      if (!map.current || !map.current.isStyleLoaded()) return;

      const geojsonFeatures = trafficPoints.map((p) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [p.lng, p.lat],
        },
        properties: {
          intensity: p.intensity || 0.5,
          congestion: p.congestion,
          street: p.street,
          speed: p.speed,
        },
      }));

      const sourceId = "heatmap-source";
      const layerId = "heatmap-circles";

      if (map.current.getSource(sourceId)) {
        map.current.getSource(sourceId).setData({
          type: "FeatureCollection",
          features: geojsonFeatures,
        });
        return;
      }

      map.current.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: geojsonFeatures,
        },
      });

      // Añadimos una capa de círculos expansivos con alto nivel de blur para simular manchas térmicas
      map.current.addLayer({
        id: layerId,
        type: "circle",
        source: sourceId,
        paint: {
          // Radios grandes que abarcan toda la zona cercana al punto del sensor
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            60, // A zoom alejado, la mancha abarca gran territorio
            15,
            140, // A zoom cercano, se expande cubriendo las vialidades colindantes
          ],
          // Colores dinámicos según el nivel de congestión
          "circle-color": [
            "match",
            ["get", "congestion"],
            "bajo",
            "#22c55e", // Verde fluido
            "moderado",
            "#eab308", // Amarillo moderado
            "alto",
            "#f97316", // Naranja denso
            "severo",
            "#ef4444", // Rojo crítico
            "#3b82f6",
          ],
          // Opacidad semi-transparente para permitir la fusión de manchas
          "circle-opacity": 0.45,
          // Desenfoque alto para eliminar los bordes de los círculos y unirlos
          "circle-blur": 0.5,
        },
      });

      // Evento al hacer clic en un punto del mapa de calor para ver su info
      map.current.off("click", layerId);
      map.current.on("click", layerId, (e) => {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const { street, speed, congestion } = e.features[0].properties;

        const popupHtml = `
          <div style="background-color: #e5e7eb; padding: 14px 18px 14px 14px; border-radius: 18px; font-family: system-ui, sans-serif; width: 270px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 14px; position: relative;">
            <button onclick="this.closest('.maplibregl-popup').remove()" style="position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; border-radius: 9999px; background-color: rgba(0,0,0,0.1); color: #374151; display: flex; align-items: center; justify-content: center; font-size: 13px; border: none; outline: none; cursor: pointer;">
              &times;
            </button>
            <img src="${trafficImage}" alt="Tráfico" style="width: 80px; height: auto; object-fit: contain; flex-shrink: 0;" />
            <div style="display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #1f2937; line-height: 1.3; width: 100%;">
              <div><strong style="color: #374151;">Zona:</strong><br/>${street ? "Sector " + street : "Zona Urbana General"}</div>
              <div style="margin-top: 2px;"><strong style="color: #374151;">Velocidad:</strong> ${speed ?? "N/A"} km/h</div>
              <div style="margin-top: 2px;"><strong style="color: #374151;">Nivel:</strong> <span style="text-transform: capitalize; font-weight: 600;">${congestion}</span></div>
            </div>
          </div>
        `;

        new maplibregl.Popup({
          className: "custom-traffic-popup",
          offset: 15,
          closeButton: true,
          closeOnClick: true,
        })
          .setLngLat(coordinates)
          .setHTML(popupHtml)
          .addTo(map.current);
      });

      map.current.on("mouseenter", layerId, () => {
        if (map.current) map.current.getCanvas().style.cursor = "pointer";
      });

      map.current.on("mouseleave", layerId, () => {
        if (map.current) map.current.getCanvas().style.cursor = "";
      });
    };

    if (map.current.isStyleLoaded()) {
      renderHeatmapLayers();
    } else {
      map.current.once("styledata", renderHeatmapLayers);
    }
  }, [trafficPoints, mapLoaded]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Badge informativo flotante en la parte superior */}
      <div className="absolute top-3 left-3 right-14 sm:right-20 sm:left-auto sm:w-auto z-20 bg-white/95 dark:bg-gray-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-700/60 flex items-center space-x-2 pointer-events-auto transition-colors duration-300">
        {!isOnline && (
          <span className="text-[10px] bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full shadow-xs">
            Offline (Caché)
          </span>
        )}
        <h2 className="text-xs font-bold text-gray-800 dark:text-gray-100 m-0">
          Mapa de Calor Geoespacial
        </h2>
        <span className="text-[11px] bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 font-semibold px-2.5 py-0.5 rounded-full">
          Concentración de Tráfico
        </span>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 dark:bg-gray-950/80 text-gray-500 dark:text-gray-400 z-30 backdrop-blur-xs">
          Generando mapa de calor de Mérida...
        </div>
      )}

      {/* Contenedor del mapa */}
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};

export default HeatmapView;
