import { useEffect, useState, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import maplibreglWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import axios from "axios";
import trafficImage from "../assets/traffic.png";

if (typeof maplibregl.setWorkerUrl === "function") {
  maplibregl.setWorkerUrl(maplibreglWorkerUrl);
}

const HeatmapView = () => {
  const [trafficPoints, setTrafficPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  const mapContainer = useRef(null);
  const map = useRef(null);
  const meridaCenter = [-89.5926, 20.9674]; // [lng, lat] para MapLibre

  // 1. Obtener datos de la API
  useEffect(() => {
    const fetchHeatmapData = async () => {
      try {
        const response = await axios.get(
          "https://movilmerida.onrender.com/api/traffic/heatmap",
        );
        if (response.data.success) {
          setTrafficPoints(response.data.data);
        }
      } catch (error) {
        console.error("Error al obtener datos del mapa de calor:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHeatmapData();
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

  // 3. Agregar los puntos de calor / círculos de densidad cuando el mapa cargue
  useEffect(() => {
    if (!map.current || !mapLoaded || trafficPoints.length === 0) return;

    // Convertimos los datos al formato GeoJSON Source que usa MapLibre
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
      map.current.getCanvas().style.cursor = "pointer";
    });

    map.current.on("mouseleave", layerId, () => {
      map.current.getCanvas().style.cursor = "";
    });
  }, [trafficPoints, mapLoaded]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Badge informativo flotante en la parte superior */}
      <div className="absolute top-4 right-14 sm:right-20 z-20 bg-white/95 dark:bg-gray-900/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-700/60 flex items-center space-x-3 pointer-events-auto">
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
