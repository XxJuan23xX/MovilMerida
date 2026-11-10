import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

// 1. Datos horarios históricos de velocidad y congestión en Mérida
const hourlyData24 = [
  { hora: "00:00", velocidad: 65, congestion: 12, estado: "Fluido" },
  { hora: "02:00", velocidad: 64, congestion: 10, estado: "Fluido" },
  { hora: "04:00", velocidad: 66, congestion: 8, estado: "Fluido" },
  { hora: "06:00", velocidad: 48, congestion: 40, estado: "Moderado" },
  { hora: "07:00", velocidad: 30, congestion: 75, estado: "Hora Pico" },
  { hora: "08:00", velocidad: 28, congestion: 82, estado: "Hora Pico" },
  { hora: "09:00", velocidad: 16, congestion: 92, estado: "Severo" },
  { hora: "10:00", velocidad: 15, congestion: 95, estado: "Severo" },
  { hora: "11:00", velocidad: 22, congestion: 78, estado: "Alto" },
  { hora: "12:00", velocidad: 44, congestion: 52, estado: "Moderado" },
  { hora: "13:00", velocidad: 42, congestion: 58, estado: "Moderado" },
  { hora: "14:00", velocidad: 45, congestion: 50, estado: "Moderado" },
  { hora: "15:00", velocidad: 18, congestion: 90, estado: "Severo" },
  { hora: "16:00", velocidad: 17, congestion: 94, estado: "Severo" },
  { hora: "17:00", velocidad: 24, congestion: 80, estado: "Alto" },
  { hora: "18:00", velocidad: 38, congestion: 62, estado: "Moderado" },
  { hora: "19:00", velocidad: 31, congestion: 74, estado: "Hora Pico" },
  { hora: "20:00", velocidad: 32, congestion: 72, estado: "Hora Pico" },
  { hora: "21:00", velocidad: 36, congestion: 60, estado: "Moderado" },
  { hora: "22:00", velocidad: 50, congestion: 35, estado: "Fluido" },
  { hora: "23:00", velocidad: 58, congestion: 20, estado: "Fluido" },
];

const hourlyData12 = [
  { hora: "12:00", velocidad: 44, congestion: 52, estado: "Moderado" },
  { hora: "13:00", velocidad: 42, congestion: 58, estado: "Moderado" },
  { hora: "14:00", velocidad: 45, congestion: 50, estado: "Moderado" },
  { hora: "15:00", velocidad: 18, congestion: 90, estado: "Severo" },
  { hora: "16:00", velocidad: 17, congestion: 94, estado: "Severo" },
  { hora: "17:00", velocidad: 24, congestion: 80, estado: "Alto" },
  { hora: "18:00", velocidad: 38, congestion: 62, estado: "Moderado" },
  { hora: "19:00", velocidad: 31, congestion: 74, estado: "Hora Pico" },
  { hora: "20:00", velocidad: 32, congestion: 72, estado: "Hora Pico" },
  { hora: "21:00", velocidad: 36, congestion: 60, estado: "Moderado" },
  { hora: "22:00", velocidad: 50, congestion: 35, estado: "Fluido" },
  { hora: "23:00", velocidad: 58, congestion: 20, estado: "Fluido" },
];

const hourlyData6 = [
  { hora: "18:00", velocidad: 38, congestion: 62, estado: "Moderado" },
  { hora: "19:00", velocidad: 31, congestion: 74, estado: "Hora Pico" },
  { hora: "20:00", velocidad: 32, congestion: 72, estado: "Hora Pico" },
  { hora: "21:00", velocidad: 36, congestion: 60, estado: "Moderado" },
  { hora: "22:00", velocidad: 50, congestion: 35, estado: "Fluido" },
  { hora: "23:00", velocidad: 58, congestion: 20, estado: "Fluido" },
];

const timeRangeConfigs = {
  "24h": {
    label: "24 Horas",
    subtitle:
      "Comportamiento histórico ponderado a lo largo de las 24 horas del día.",
    data: hourlyData24,
  },
  "12h": {
    label: "12 Horas",
    subtitle:
      "Comportamiento y caídas de velocidad durante las últimas 12 horas.",
    data: hourlyData12,
  },
  "6h": {
    label: "6 Horas",
    subtitle:
      "Monitoreo vial detallado y reciente durante las últimas 6 horas.",
    data: hourlyData6,
  },
};

// 2. Datos del gráfico de anillos de congestión (Power BI exacto: 1,500 registros)
const donutData = [
  {
    name: "moderado",
    label: "moderado",
    value: 760,
    percent: "50.67%",
    color: "#0084ff",
  },
  {
    name: "bajo",
    label: "bajo",
    value: 246,
    percent: "16.40%",
    color: "#1b365d",
  },
  {
    name: "alto",
    label: "alto",
    value: 374,
    percent: "24.93%",
    color: "#ea580c",
  },
  {
    name: "severo",
    label: "severo",
    value: 120,
    percent: "8.00%",
    color: "#701a75",
  },
];

// 3. Datos de la gráfica de barras por sector vial
const sectorData = [
  { sector: "Centro Histórico", demora: 16.5, velocidad: 18, color: "#e11d48" },
  { sector: "Periférico Norte", demora: 13.8, velocidad: 29, color: "#f97316" },
  {
    sector: "Periférico Poniente",
    demora: 11.2,
    velocidad: 35,
    color: "#3b82f6",
  },
  {
    sector: "Glorieta de la Paz",
    demora: 10.4,
    velocidad: 38,
    color: "#0284c7",
  },
  { sector: "Zona Altabrisa", demora: 7.2, velocidad: 45, color: "#10b981" },
  { sector: "Zona Sur / UTM", demora: 5.0, velocidad: 54, color: "#059669" },
];

// Componente para Tooltip personalizado de Líneas
const HourlyCustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 text-xs">
        <p className="font-bold text-gray-800 dark:text-gray-100 flex items-center justify-between gap-4">
          <span>{label} hrs</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              data.estado === "Severo"
                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                : data.estado === "Hora Pico"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            }`}
          >
            {data.estado}
          </span>
        </p>
        <div className="mt-1.5 space-y-1">
          <p className="text-gray-600 dark:text-gray-300">
            Velocidad:{" "}
            <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
              {data.velocidad} km/h
            </strong>
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            Congestión estimada: <strong>{data.congestion}%</strong>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

// Componente para Tooltip personalizado de Anillos
const DonutCustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 text-xs z-50">
        <div className="flex items-center space-x-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <p className="font-bold capitalize text-gray-800 dark:text-gray-100">
            {data.name}
          </p>
        </div>
        <p className="mt-1 text-gray-600 dark:text-gray-300">
          Recuento:{" "}
          <strong className="text-slate-800 dark:text-white font-bold">
            {data.value.toLocaleString()}
          </strong>
        </p>
        <p className="text-gray-600 dark:text-gray-300">
          Proporción:{" "}
          <strong className="text-emerald-600 dark:emerald-400 font-bold">
            {data.percent}
          </strong>
        </p>
      </div>
    );
  }
  return null;
};

// Componente para Tooltip personalizado de Barras
const BarCustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 text-xs">
        <p className="font-bold text-gray-800 dark:text-gray-100">
          {data.sector}
        </p>
        <p className="mt-1 text-gray-600 dark:text-gray-300">
          Demora promedio:{" "}
          <strong className="text-rose-600 dark:text-rose-400 font-bold">
            {data.demora} min
          </strong>
        </p>
        <p className="text-gray-600 dark:text-gray-300">
          Velocidad registrada:{" "}
          <strong className="text-blue-600 dark:text-blue-400 font-bold">
            {data.velocidad} km/h
          </strong>
        </p>
      </div>
    );
  }
  return null;
};

const AnalyticsView = ({ isExpanded = false }) => {
  const [activeDonutIndex, setActiveDonutIndex] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState("24h");

  const currentRangeConfig =
    timeRangeConfigs[selectedTimeRange] || timeRangeConfigs["24h"];

  return (
    <div
      className={`relative w-full h-full flex flex-col bg-gray-50 dark:bg-gray-950 overflow-y-auto transition-all duration-300 ease-in-out p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 ${
        isExpanded ? "md:pl-[392px]" : "md:pl-24 lg:pl-32"
      }`}
    >
      {/* Encabezado / Título principal */}
      <div className="flex flex-col mb-6 pt-2 px-1">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-700 dark:text-white tracking-tight m-0">
          Dashboard Analítico
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
          Monitoreo global del tráfico y comportamiento vial histórico en
          Mérida.
        </p>
      </div>

      {/* Tarjetas de Indicadores Clave (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Card 1: Velocidad Promedio */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-800 flex flex-col justify-between">
          <div>
            <div className="flex items-baseline space-x-1">
              <span className="text-3xl font-black text-slate-700 dark:text-white tracking-tight">
                47.15
              </span>
              <span className="text-sm font-bold text-slate-700 dark:text-gray-400">
                km/h
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-semibold">
              Velocidad Promedio Global
            </p>
          </div>
          <div className="mt-4 pt-3">
            <div className="w-full bg-emerald-500 h-1.5 rounded-full"></div>
          </div>
        </div>

        {/* Card 2: Demora en Picos */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-800 flex flex-col justify-between">
          <div>
            <div className="flex items-baseline space-x-1">
              <span className="text-3xl font-black text-slate-700 dark:text-white tracking-tight">
                11.7
              </span>
              <span className="text-sm font-bold text-slate-700 dark:text-gray-400">
                min
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-semibold">
              Demora Promedio en Picos
            </p>
          </div>
          <div className="mt-4 pt-3">
            <div className="w-full bg-emerald-500 h-1.5 rounded-full"></div>
          </div>
        </div>

        {/* Card 3: Volumen Vehicular */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-800 flex flex-col justify-between">
          <div>
            <div className="flex items-baseline space-x-1">
              <span className="text-3xl font-black text-slate-700 dark:text-white tracking-tight">
                677k
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md ml-2">
                1,500 Nodos
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-semibold">
              Volumen Vehicular Histórico
            </p>
          </div>
          <div className="mt-4 pt-3">
            <div className="w-full bg-emerald-500 h-1.5 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Sección de Gráficos Analíticos */}
      <div className="flex flex-col gap-6">
        {/* Gráfica 1: Tendencia Horaria (Líneas / Área) */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-800 p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-2 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-100">
                Tendencia Horaria de Velocidad vs Horas Pico
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {currentRangeConfig.subtitle}
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <div className="hidden sm:flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-gray-500 dark:text-gray-400 font-medium">
                  Velocidad (km/h)
                </span>
              </div>

              {/* Selector interactivo de rango horario: 24h - 12h - 6h */}
              <div className="inline-flex items-center bg-slate-100 dark:bg-gray-800 p-0.5 rounded-xl border border-gray-200/60 dark:border-gray-700/60 shadow-xs">
                {[
                  { key: "24h", label: "24 Horas", short: "24h" },
                  { key: "12h", label: "12 Horas", short: "12h" },
                  { key: "6h", label: "6 Horas", short: "6h" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setSelectedTimeRange(item.key)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                      selectedTimeRange === item.key
                        ? "bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span className="hidden sm:inline">{item.label}</span>
                    <span className="sm:hidden">{item.short}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full h-64 sm:h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={currentRangeConfig.data}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="speedGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#94a3b8"
                  strokeOpacity={0.15}
                  vertical={false}
                />
                <XAxis
                  dataKey="hora"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={{ stroke: "#94a3b8", strokeOpacity: 0.2 }}
                  tickLine={false}
                />
                <YAxis
                  unit=" km/h"
                  domain={[0, 80]}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={{ stroke: "#94a3b8", strokeOpacity: 0.2 }}
                  tickLine={false}
                />
                <Tooltip content={<HourlyCustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="velocidad"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#speedGradient)"
                  isAnimationActive={true}
                  animationDuration={600}
                  animationEasing="ease-in-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sección inferior: 2 Gráficas en 1 sola fila */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfica 2: Distribución de Congestión (Gráfica de Anillos con datos de _id) */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-800 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-slate-700 dark:text-slate-100">
                    Distribución de Niveles de Congestión
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Clasificación y conteo de nodos según saturación vial.
                  </p>
                </div>
                <span className="text-[11px] bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-md font-semibold">
                  1,500 nodos
                </span>
              </div>

              {/* Contenedor del Anillo con valor central "1.5 mil" */}
              <div className="relative w-full h-56 flex items-center justify-center my-2">
                {/* Texto Central del Donut ("1.5 mil") en capa z-0 para que el tooltip quede siempre por encima */}
                <div className="absolute inset-0 z-0 flex flex-col items-center justify-center pointer-events-none select-none">
                  <span className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                    1.5 mil
                  </span>
                  <span className="text-[11px] font-medium text-gray-400 -mt-0.5">
                    Total
                  </span>
                </div>

                <div className="relative z-10 w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        content={<DonutCustomTooltip />}
                        wrapperStyle={{ zIndex: 100, pointerEvents: "none" }}
                      />
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={92}
                        paddingAngle={2.5}
                        dataKey="value"
                        onMouseEnter={(_, index) => setActiveDonutIndex(index)}
                        onMouseLeave={() => setActiveDonutIndex(null)}
                      >
                        {donutData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            opacity={
                              activeDonutIndex === null ||
                              activeDonutIndex === index
                                ? 1
                                : 0.6
                            }
                            stroke="transparent"
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Leyenda y distribución en cuadrícula compacta */}
              <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                {donutData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-2 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/60"
                  >
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-200 capitalize">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-100">
                      {item.value}{" "}
                      <span className="text-[10px] text-gray-400 font-normal">
                        ({item.percent})
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gráfica 3: Gráfica de Barras por Sectores */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-800 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-slate-700 dark:text-slate-100">
                    Demora Promedio por Sectores
                  </h3>
                  <p className="text-xs text-gray-400">
                    Minutos de retraso estimado en sectores viales críticos.
                  </p>
                </div>
                <span className="text-[11px] bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-md font-semibold">
                  Puntos Críticos
                </span>
              </div>

              {/* Gráfica de Barras con Recharts */}
              <div className="w-full h-64 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sectorData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#94a3b8"
                      strokeOpacity={0.15}
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      unit=" min"
                      domain={[0, 20]}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={{ stroke: "#94a3b8", strokeOpacity: 0.2 }}
                      tickLine={false}
                    />
                    <YAxis
                      dataKey="sector"
                      type="category"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      axisLine={{ stroke: "#94a3b8", strokeOpacity: 0.2 }}
                      tickLine={false}
                      width={100}
                    />
                    <Tooltip content={<BarCustomTooltip />} />
                    <Bar dataKey="demora" radius={[0, 6, 6, 0]}>
                      {sectorData.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie de gráfica con nota explicativa */}
              <div className="mt-2 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[15px] text-gray-500 dark:text-gray-400">
                <span>
                  Sector de mayor congestión:{" "}
                  <strong className="text-rose-600 dark:text-rose-400">
                    Centro Histórico
                  </strong>
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Atlas Sync ✓
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
