import { useState, useEffect } from "react";
import axios from "axios";
import {
  Brain,
  Sparkles,
  Clock,
  MapPin,
  Zap,
  AlertTriangle,
  Activity,
  Calendar,
} from "lucide-react";
import { PredictionSkeleton, PredictionResultSkeleton } from "./Skeletons";

// Las 26 vialidades registradas en la colección trafficrecords de MongoDB
const MERIDA_STREETS = [
  "Anillo Periférico Norte (Zona Altabrisa)",
  "Anillo Periférico Poniente (Caucel)",
  "Anillo Periférico Sur",
  "Anillo Periférico Sur (Kanasín)",
  "Av. Itzáes (Frente al O'Horán)",
  "Avenida 86",
  "Avenida Aviación (Rumbo al Aeropuerto)",
  "Avenida Aviación x Calle 128",
  "Avenida García Lavín x Periférico",
  "Avenida Itzáes x Calle 59",
  "Avenida Jacinto Canek",
  "Avenida Mérida 2000",
  "Calle 33 (Zona Macroplaza)",
  "Calle 59 x Circuito Colonias",
  "Calle 60 Norte (Zona Gran Plaza)",
  "Carretera Mérida - Umán",
  "Centro Histórico",
  "Glorieta de Prolongación Montejo",
  "Glorieta de la Fuente de Piedra",
  "Glorieta de la Paz",
  "Parque Extremo",
  "Periférico Norte - Tramo Prueba",
  "Prolongación Montejo x Periférico Norte",
  "Unidad Deportiva Inalámbrica",
  "Universidad Tecnológica Metropolitana (UTM)",
  "Villa Palmira",
];

const DAYS_OF_WEEK = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

// Componente de Velocímetro Semicircular Animado
const SpeedometerGauge = ({ speed = 0, maxSpeed = 80 }) => {
  const [animatedSpeed, setAnimatedSpeed] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedSpeed(speed);
    }, 80);
    return () => clearTimeout(timer);
  }, [speed]);

  const clampedSpeed = Math.max(0, Math.min(maxSpeed, animatedSpeed));
  // Ángulo de aguja: de -90° (0 km/h) a +90° (maxSpeed km/h)
  const angle = -90 + (clampedSpeed / maxSpeed) * 180;

  const getDialColor = (s) => {
    if (s < 25) return "#f43f5e"; // rose-500
    if (s < 40) return "#f59e0b"; // amber-500
    if (s < 60) return "#3b82f6"; // blue-500
    return "#10b981"; // emerald-500
  };

  const dialColor = getDialColor(clampedSpeed);

  // Semicírculo r = 40 => longitud del arco = PI * r ≈ 125.66
  const strokeDash = 125.66;
  const strokeOffset = strokeDash - (clampedSpeed / maxSpeed) * strokeDash;

  return (
    <div className="relative w-36 h-24 flex items-center justify-center my-1 select-none">
      <svg viewBox="0 0 120 78" className="w-full h-full overflow-visible">
        {/* Arco de fondo inactivo */}
        <path
          d="M 20 68 A 40 40 0 0 1 100 68"
          fill="none"
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-700/60"
          strokeWidth="7"
          strokeLinecap="round"
        />

        {/* Marcas de graduación */}
        {[0, 20, 40, 60, 80].map((val, idx) => {
          const tickAngle = (-180 + (idx / 4) * 180) * (Math.PI / 180);
          const x1 = 60 + 47 * Math.cos(tickAngle);
          const y1 = 68 + 47 * Math.sin(tickAngle);
          const x2 = 60 + 42 * Math.cos(tickAngle);
          const y2 = 68 + 42 * Math.sin(tickAngle);
          return (
            <line
              key={val}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              className="text-gray-300 dark:text-gray-600"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          );
        })}

        {/* Arco de progreso animado */}
        <path
          d="M 20 68 A 40 40 0 0 1 100 68"
          fill="none"
          stroke={dialColor}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={strokeDash}
          strokeDashoffset={strokeOffset}
          style={{
            transition:
              "stroke-dashoffset 1.1s cubic-bezier(0.34, 1.25, 0.64, 1), stroke 0.6s ease",
            filter: `drop-shadow(0 0 3px ${dialColor}40)`,
          }}
        />

        {/* Aguja indicadora que rota según la velocidad */}
        <g
          transform={`translate(60, 68) rotate(${angle})`}
          style={{
            transition: "transform 1.1s cubic-bezier(0.34, 1.25, 0.64, 1)",
          }}
        >
          {/* Tallo de aguja */}
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="-34"
            stroke={dialColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Punta */}
          <polygon points="-2,-22 0,-36 2,-22" fill={dialColor} />
        </g>

        {/* Centro del pivote */}
        <circle
          cx="60"
          cy="68"
          r="6.5"
          className="fill-gray-900 dark:fill-white stroke-2 stroke-white dark:stroke-gray-900"
          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }}
        />
        <circle cx="60" cy="68" r="2.5" fill={dialColor} />
      </svg>
    </div>
  );
};

// Componente de Círculo de Frecuencia (Vacío al centro, sin texto ni iconos)
const FrequencyCircle = ({ level = "moderado" }) => {
  const getFrequencyConfig = (lvl) => {
    switch (lvl?.toLowerCase()) {
      case "bajo":
        return { color: "#10b981", rgb: "16, 185, 129" };
      case "moderado":
        return { color: "#3b82f6", rgb: "59, 130, 246" };
      case "alto":
        return { color: "#f59e0b", rgb: "245, 158, 11" };
      case "severo":
        return { color: "#f43f5e", rgb: "244, 63, 94" };
      default:
        return { color: "#10b981", rgb: "16, 185, 129" };
    }
  };

  const { color, rgb } = getFrequencyConfig(level);

  // 24 barras de frecuencia radiales que oscilan en círculo
  const waveBars = [
    0.45, 0.75, 0.95, 0.6, 0.85, 1.0, 0.7, 0.5, 0.85, 0.95, 0.6, 0.8, 1.0, 0.75,
    0.55, 0.7, 0.9, 0.65, 0.85, 0.95, 0.6, 0.8, 0.5, 0.75,
  ];

  return (
    <div className="relative w-36 h-24 flex items-center justify-center my-1 select-none">
      {/* Ondas concéntricas de pulso exterior */}
      <div
        className="absolute w-20 h-20 rounded-full animate-ping opacity-25 pointer-events-none"
        style={{ backgroundColor: color, animationDuration: "3s" }}
      />
      <div
        className="absolute w-16 h-16 rounded-full animate-pulse opacity-30 pointer-events-none"
        style={{ backgroundColor: color, animationDuration: "2s" }}
      />

      <svg
        viewBox="0 0 100 100"
        className="w-22 h-22 relative z-10 overflow-visible"
      >
        {/* Anillo de base */}
        <circle
          cx="50"
          cy="50"
          r="26"
          fill="none"
          stroke={`rgba(${rgb}, 0.18)`}
          strokeWidth="2"
        />

        {/* Barras de frecuencia radiales */}
        {waveBars.map((barFactor, i) => {
          const angleRad = (i / waveBars.length) * 2 * Math.PI;
          const rInner = 26;
          const rOuter = 26 + barFactor * 13;
          const x1 = 50 + rInner * Math.cos(angleRad);
          const y1 = 50 + rInner * Math.sin(angleRad);
          const x2 = 50 + rOuter * Math.cos(angleRad);
          const y2 = 50 + rOuter * Math.sin(angleRad);

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{
                opacity: 0.5 + barFactor * 0.5,
                filter: `drop-shadow(0 0 2px rgba(${rgb}, 0.45))`,
              }}
            />
          );
        })}

        {/* Órbita punteada animada */}
        <circle
          cx="50"
          cy="50"
          r="20"
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeDasharray="4 3"
          className="animate-spin"
          style={{ animationDuration: "18s", transformOrigin: "50% 50%" }}
        />

        {/* NÚCLEO TOTALMENTE VACÍO (Sin iconos ni texto) */}
        <circle
          cx="50"
          cy="50"
          r="15"
          className="fill-slate-50 dark:fill-gray-900 stroke-1 stroke-slate-200 dark:stroke-gray-800"
        />
      </svg>
    </div>
  );
};

const PredictionView = ({ isExpanded = false }) => {
  // Obtener el día actual en español
  const getCurrentDayName = () => {
    const days = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];
    return days[new Date().getDay()];
  };

  const [street, setStreet] = useState("Av. Itzáes (Frente al O'Horán)");
  const [day, setDay] = useState(getCurrentDayName);
  const [hour, setHour] = useState(8);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [streetsList, setStreetsList] = useState(MERIDA_STREETS);

  // Simulación de carga inicial fluida para mostrar Skeleton profesional
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Intentar cargar la lista dinámica de calles desde FastAPI si está activo
  useEffect(() => {
    const fetchStreets = async () => {
      try {
        const res = await axios.get(
          "https://movilmerida-ak1o.onrender.com/api/ml/streets",
          {
            timeout: 2000,
          },
        );
        if (
          res.data?.success &&
          Array.isArray(res.data.streets) &&
          res.data.streets.length > 0
        ) {
          setStreetsList(res.data.streets);
        }
      } catch {
        // Mantiene MERIDA_STREETS por defecto
      }
    };
    fetchStreets();
  }, []);

  // Horarios de muestra típicos en Mérida
  const quickHours = [
    { label: "8:00 AM", value: 8, tag: "Pico Matutino" },
    { label: "14:00 hrs", value: 14, tag: "Pico Escolar/Almuerzo" },
    { label: "19:00 hrs", value: 19, tag: "Pico Vespertino" },
    { label: "23:00 hrs", value: 23, tag: "Nocturno Despejado" },
  ];

  // Estimación estadística de respaldo idéntica al modelo de simulación de Mérida
  const calculateSimulatedEstimate = (h, streetName, dayName = "Lunes") => {
    const nameLower = (streetName || "").toLowerCase();
    const isAlwaysFluid = [
      "villa palmira",
      "inalámbrica",
      "inalambrica",
      "parque extremo",
    ].some((z) => nameLower.includes(z));
    const isAirportUtm = [
      "aviación",
      "universidad tecnológica",
      "utm",
      "86",
      "mérida 2000",
    ].some((z) => nameLower.includes(z));
    const isCongestedArtery = [
      "periférico",
      "periferico",
      "centro histórico",
      "itzáes",
      "glorieta",
      "macroplaza",
    ].some((z) => nameLower.includes(z));

    let speed;
    let congestion;

    if (isAlwaysFluid) {
      speed = 65;
      congestion = "bajo";
    } else if (h >= 0 && h <= 5) {
      speed = 65;
      congestion = "bajo";
    } else if (h >= 6 && h <= 8) {
      speed = isCongestedArtery ? 22 : isAirportUtm ? 35 : 30;
      congestion = speed < 25 ? "severo" : "alto";
    } else if (h >= 9 && h <= 11) {
      speed = isCongestedArtery ? 15 : isAirportUtm ? 28 : 20;
      congestion = speed < 25 ? "severo" : "alto";
    } else if (h >= 12 && h <= 14) {
      speed = isCongestedArtery ? 35 : isAirportUtm ? 50 : 45;
      congestion = speed < 40 ? "alto" : "moderado";
    } else if (h >= 15 && h <= 17) {
      speed = isCongestedArtery ? 16 : isAirportUtm ? 25 : 18;
      congestion = "severo";
    } else if (h === 18) {
      speed = isCongestedArtery ? 30 : isAirportUtm ? 45 : 40;
      congestion = speed < 35 ? "alto" : "moderado";
    } else if (h >= 19 && h <= 21) {
      speed = isCongestedArtery ? 24 : isAirportUtm ? 38 : 32;
      congestion = "alto";
    } else {
      speed = isCongestedArtery ? 45 : 52;
      congestion = "moderado";
    }

    // Ajuste por fin de semana: el tráfico en Mérida suele fluir mejor
    const isWeekend = dayName === "Sábado" || dayName === "Domingo";
    if (isWeekend && speed < 55) {
      speed = Math.min(65, Math.round(speed * 1.25));
      congestion =
        speed < 25
          ? "severo"
          : speed < 40
            ? "alto"
            : speed < 60
              ? "moderado"
              : "bajo";
    }

    return {
      success: true,
      query_hour: h,
      query_street: streetName,
      query_day: dayName,
      predicted_average_speed_kmh: speed,
      estimated_congestion_level: congestion,
      is_simulated_fallback: true,
    };
  };

  const handlePredict = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.get(
        `https://movilmerida-ak1o.onrender.com/api/ml/predict?hour=${hour}&street=${encodeURIComponent(street)}&day=${encodeURIComponent(day)}`,
        { timeout: 3500 },
      );

      if (response.data.success) {
        setResult(response.data);
      } else {
        setError(
          response.data.error || "Ocurrió un error al calcular la predicción.",
        );
      }
    } catch (err) {
      console.warn(
        "Microservicio FastAPI local no disponible, activando estimación matemática:",
        err,
      );
      const simulated = calculateSimulatedEstimate(hour, street, day);
      setResult(simulated);
      setError(
        "No se pudo conectar con el microservicio de Python (FastAPI en puerto 8000). Se ha generado una estimación predictiva con las 26 vialidades históricas de Mérida.",
      );
    } finally {
      setLoading(false);
    }
  };

  const getCongestionBadgeStyle = (level) => {
    switch (level?.toLowerCase()) {
      case "bajo":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "moderado":
        return "bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "alto":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "severo":
        return "bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      default:
        return "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
    }
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col bg-gray-50 dark:bg-gray-950 overflow-y-auto transition-all duration-300 ease-in-out p-4 sm:p-6 lg:p-8 pb-28 md:pb-8 ${
        isExpanded ? "md:pl-[392px]" : "md:pl-24 lg:pl-32"
      }`}
    >
      {isInitialLoading ? (
        <PredictionSkeleton />
      ) : (
        <>
          {/* 1. ENCABEZADO PRINCIPAL */}
      <div className="flex flex-col mb-6 pt-2 px-1 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Sparkles size={14} className="animate-spin text-emerald-500" />
            Machine Learning & Big Data
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-700 dark:text-white tracking-tight flex items-center gap-2.5">
          <Brain className="text-emerald-600 dark:text-emerald-400" size={30} />
          Predicción de Tráfico por Calle y Avenida
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
          Consulta la estimación de velocidad y nivel de congestión entrenada
          con <strong>Random Forest Regressor</strong> sobre los 26 tramos y
          arterias del mapa vial de Mérida.
        </p>
      </div>

      {/* 2. GRID PRINCIPAL: FORMULARIO Y RESULTADO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl mx-auto w-full">
        {/* Panel Izquierdo: Configuración de Parámetros */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-800 flex flex-col justify-between">
          <form onSubmit={handlePredict} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                <MapPin
                  size={15}
                  className="text-emerald-600 dark:text-emerald-400"
                />
                Calle / Avenida de Mérida ({streetsList.length})
              </label>
              <select
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl p-3 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-colors"
              >
                {streetsList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                <Calendar
                  size={15}
                  className="text-emerald-600 dark:text-emerald-400"
                />
                Día de la Semana
              </label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl p-3 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-colors"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Clock
                    size={15}
                    className="text-emerald-600 dark:text-emerald-400"
                  />
                  Hora a Evaluar
                </label>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/50">
                  {hour < 10 ? `0${hour}:00` : `${hour}:00`} hrs
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="23"
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between text-[11px] text-gray-400 mt-1 font-medium">
                <span>00:00 (Noche)</span>
                <span>12:00 (Mediodía)</span>
                <span>23:00 (Noche)</span>
              </div>
            </div>

            {/* Accesos rápidos de horas clave */}
            <div>
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-2">
                Horarios Típicos de Mérida
              </span>
              <div className="grid grid-cols-2 gap-2">
                {quickHours.map((qh) => (
                  <button
                    key={qh.value}
                    type="button"
                    onClick={() => setHour(qh.value)}
                    className={`p-2 rounded-xl text-xs font-medium border text-left transition-all cursor-pointer ${
                      hour === qh.value
                        ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold"
                        : "bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-bold">{qh.label}</div>
                    <div className="text-[10px] opacity-75 truncate">
                      {qh.tag}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl transition-all text-sm shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Activity size={18} className="animate-spin" />
                  <span>Entrenando y evaluando con IA...</span>
                </>
              ) : (
                <>
                  <Zap size={18} />
                  <span>Predecir Tráfico en Vialidad</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Panel Derecho: Visualización de Resultados */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-800 flex flex-col justify-center items-center text-center min-h-[380px]">
          {error && (
            <div className="text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 rounded-xl text-xs sm:text-sm w-full border border-amber-300 dark:border-amber-700 mb-4 flex items-start gap-2.5 text-left">
              <AlertTriangle
                size={18}
                className="flex-shrink-0 mt-0.5 text-amber-500"
              />
              <div>
                <p className="font-semibold">{error}</p>
                <p className="text-[11px] mt-1 text-amber-600 dark:text-amber-400">
                  Para habilitar FastAPI local:{" "}
                  <code className="bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-mono">
                    uvicorn main:app --reload --port 8000
                  </code>{" "}
                  dentro de{" "}
                  <code className="bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-mono">
                    python-ml-api
                  </code>
                  .
                </p>
              </div>
            </div>
          )}

          {!result && !loading && (
            <div className="text-gray-400 dark:text-gray-500 py-12 flex flex-col items-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-gray-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 shadow-inner">
                <Brain size={32} />
              </div>
              <h3 className="font-bold text-gray-700 dark:text-gray-200 text-base mb-1">
                Selecciona una Vialidad
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Elige cualquiera de las{" "}
                <strong>26 vialidades registradas</strong> en el mapa y la hora
                del día para predecir su comportamiento con Random Forest.
              </p>
            </div>
          )}

          {loading && <PredictionResultSkeleton />}

          {result && !loading && (
            <div className="w-full space-y-6 text-left">
              {/* 1. ENCABEZADO LIMPIO (Sin card gris sólida) */}
              <div className="pb-3 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1.5 mb-1">
                    <MapPin size={12} />
                    Vialidad Evaluada
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-700 dark:text-white tracking-tight">
                    {result.query_street}
                  </h3>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 font-medium">
                  <span className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800/60 px-2.5 py-1 rounded-lg border border-gray-200/60 dark:border-gray-700/60 font-semibold text-gray-700 dark:text-gray-200">
                    <Calendar
                      size={13}
                      className="text-emerald-600 dark:text-emerald-400"
                    />
                    {result.query_day || day}
                  </span>
                  <span className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800/60 px-2.5 py-1 rounded-lg border border-gray-200/60 dark:border-gray-700/60 font-semibold text-gray-700 dark:text-gray-200">
                    <Clock
                      size={13}
                      className="text-emerald-600 dark:text-emerald-400"
                    />
                    {result.query_hour < 10
                      ? `0${result.query_hour}:00`
                      : `${result.query_hour}:00`}{" "}
                    hrs
                  </span>
                </div>
              </div>

              {/* 2. GRID DE DOS TARJETAS (Modo Claro y Oscuro nativo) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tarjeta Izquierda: Velocímetro Animado */}
                <div className="bg-slate-50/70 dark:bg-gray-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-gray-700/70 flex flex-col items-center justify-between text-center transition-colors">
                  <SpeedometerGauge
                    speed={result.predicted_average_speed_kmh}
                    maxSpeed={80}
                  />

                  <div className="mt-2">
                    <div className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                      {result.predicted_average_speed_kmh}{" "}
                      <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 font-sans">
                        Km/h
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold block">
                      Velocidad Estimada
                    </span>
                  </div>
                </div>

                {/* Tarjeta Derecha: Círculo de Frecuencia (Vacío en el centro) */}
                <div className="bg-slate-50/70 dark:bg-gray-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-gray-700/70 flex flex-col items-center justify-between text-center transition-colors">
                  <FrequencyCircle level={result.estimated_congestion_level} />

                  <div className="mt-2 flex flex-col items-center">
                    <span
                      className={`inline-block px-3.5 py-1 rounded-full text-xs font-extrabold border uppercase tracking-wider ${getCongestionBadgeStyle(
                        result.estimated_congestion_level,
                      )}`}
                    >
                      {result.estimated_congestion_level}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-semibold block">
                      Nivel de Congestión
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Botón inferior destacado "Volver a Evaluar" */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePredict}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl transition-all text-sm shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles size={18} />
                  <span>Volver a Evaluar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default PredictionView;
