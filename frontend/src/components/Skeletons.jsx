// Componentes Skeleton de carga profesional con efecto Shimmer para MovilMérida

// 1. SKELETON PARA EL MAPA DE TRAMOS (TrafficMap)
export const MapSkeleton = () => {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 bg-gray-100/70 dark:bg-gray-950/70 backdrop-blur-xs transition-opacity duration-500">
      {/* Barra superior con placeholders de búsqueda y badge */}
      <div className="flex items-center justify-between gap-3 w-full max-w-5xl">
        <div className="w-56 sm:w-72 h-11 rounded-2xl skeleton-shimmer shadow-xs" />
        <div className="w-44 sm:w-64 h-9 rounded-2xl skeleton-shimmer shadow-xs" />
      </div>

      {/* Nodos viales flotantes simulados en el mapa */}
      <div className="relative w-full h-full my-auto overflow-hidden">
        <div className="absolute top-[28%] left-[45%] w-8 h-8 rounded-full skeleton-shimmer shadow-sm animate-pulse" />
        <div className="absolute top-[40%] left-[32%] w-7 h-7 rounded-full skeleton-shimmer shadow-sm animate-pulse" />
        <div className="absolute top-[35%] right-[30%] w-8 h-8 rounded-full skeleton-shimmer shadow-sm animate-pulse" />
        <div className="absolute bottom-[35%] left-[48%] w-7 h-7 rounded-full skeleton-shimmer shadow-sm animate-pulse" />
        <div className="absolute bottom-[25%] right-[25%] w-8 h-8 rounded-full skeleton-shimmer shadow-sm animate-pulse" />
      </div>

      {/* Controles inferiores flotantes (Filtros, Modo tiempo y GPS) */}
      <div className="flex items-end justify-between w-full pb-16 md:pb-2">
        <div className="flex flex-col gap-2.5">
          <div className="w-12 h-12 rounded-full skeleton-shimmer shadow-md" />
          <div className="w-12 h-12 rounded-full skeleton-shimmer shadow-md" />
        </div>
        <div className="w-12 h-12 rounded-full skeleton-shimmer shadow-md" />
      </div>
    </div>
  );
};

// 2. SKELETON PARA EL MAPA DE CALOR (HeatmapView)
export const HeatmapSkeleton = () => {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 bg-gray-100/70 dark:bg-gray-950/70 backdrop-blur-xs transition-opacity duration-500">
      {/* Badge superior derecho */}
      <div className="flex justify-end w-full">
        <div className="w-56 sm:w-72 h-9 rounded-2xl skeleton-shimmer shadow-xs" />
      </div>

      {/* Manchas térmicas simuladas difusas */}
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="w-64 h-64 sm:w-96 sm:h-96 rounded-full bg-emerald-500/10 dark:bg-emerald-400/5 blur-3xl animate-pulse" />
        <div className="w-44 h-44 sm:w-60 sm:h-60 rounded-full bg-amber-500/10 dark:bg-amber-400/5 blur-2xl animate-pulse" />
      </div>
    </div>
  );
};

// 3. SKELETON PARA EL DASHBOARD ANALÍTICO (AnalyticsView)
export const AnalyticsSkeleton = () => {
  return (
    <div className="w-full flex flex-col space-y-6 animate-pulse">
      {/* Encabezado */}
      <div className="flex flex-col space-y-2 pt-2 px-1">
        <div className="w-60 sm:w-72 h-8 rounded-xl skeleton-shimmer" />
        <div className="w-80 sm:w-96 h-4 rounded-lg skeleton-shimmer" />
      </div>

      {/* 3 Tarjetas de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3"
          >
            <div className="w-24 h-7 rounded-xl skeleton-shimmer" />
            <div className="w-36 h-3 rounded-md skeleton-shimmer" />
            <div className="w-full h-1.5 rounded-full skeleton-shimmer mt-3" />
          </div>
        ))}
      </div>

      {/* 2 Gráficas Superiores (Líneas y Anillos) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfica de Líneas */}
        <div className="lg:col-span-8 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-48 h-5 rounded-lg skeleton-shimmer" />
            <div className="w-32 h-8 rounded-xl skeleton-shimmer" />
          </div>
          <div className="w-full h-64 rounded-xl skeleton-shimmer" />
        </div>

        {/* Gráfica de Anillos (Donut) */}
        <div className="lg:col-span-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-between space-y-4">
          <div className="w-44 h-5 rounded-lg skeleton-shimmer self-start" />
          <div className="w-48 h-48 rounded-full skeleton-shimmer my-2" />
          <div className="w-full grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-4 rounded-md skeleton-shimmer" />
            ))}
          </div>
        </div>
      </div>

      {/* Gráfica Inferior de Barras */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
        <div className="w-52 h-5 rounded-lg skeleton-shimmer" />
        <div className="space-y-3">
          {[90, 75, 60, 80, 50].map((width, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-20 h-4 rounded-md skeleton-shimmer flex-shrink-0" />
              <div
                className="h-6 rounded-lg skeleton-shimmer"
                style={{ width: `${width}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 4. SKELETON PARA LA VISTA DE PREDICCIÓN (PredictionView - Carga Inicial)
export const PredictionSkeleton = () => {
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col space-y-6 animate-pulse">
      {/* Encabezado */}
      <div className="flex flex-col space-y-2 pt-2 px-1">
        <div className="w-48 h-4 rounded-md skeleton-shimmer" />
        <div className="w-72 sm:w-96 h-8 rounded-xl skeleton-shimmer" />
        <div className="w-full max-w-xl h-4 rounded-lg skeleton-shimmer" />
      </div>

      {/* Grid: Formulario y Resultados */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulario Izquierdo */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-5">
          <div className="space-y-2">
            <div className="w-36 h-3 rounded-md skeleton-shimmer" />
            <div className="w-full h-11 rounded-xl skeleton-shimmer" />
          </div>
          <div className="space-y-2">
            <div className="w-32 h-3 rounded-md skeleton-shimmer" />
            <div className="w-full h-11 rounded-xl skeleton-shimmer" />
          </div>
          <div className="space-y-2">
            <div className="w-28 h-3 rounded-md skeleton-shimmer" />
            <div className="w-full h-4 rounded-lg skeleton-shimmer" />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {[1, 2, 3, 4].map((k) => (
              <div key={k} className="h-12 rounded-xl skeleton-shimmer" />
            ))}
          </div>
          <div className="w-full h-12 rounded-xl skeleton-shimmer pt-2" />
        </div>

        {/* Panel Derecho de Resultados */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center space-y-4 min-h-[380px]">
          <div className="w-16 h-16 rounded-2xl skeleton-shimmer" />
          <div className="w-40 h-5 rounded-lg skeleton-shimmer" />
          <div className="w-64 h-3 rounded-md skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
};

// 5. SKELETON AL EVALUAR PREDICCIÓN (PredictionView - Cuando se calcula)
export const PredictionResultSkeleton = () => {
  return (
    <div className="w-full space-y-6 text-left animate-pulse">
      {/* Header skeleton */}
      <div className="pb-3 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-1.5">
          <div className="w-28 h-3 rounded-md skeleton-shimmer" />
          <div className="w-56 h-6 rounded-lg skeleton-shimmer" />
        </div>
        <div className="flex gap-2">
          <div className="w-24 h-7 rounded-lg skeleton-shimmer" />
          <div className="w-24 h-7 rounded-lg skeleton-shimmer" />
        </div>
      </div>

      {/* Grid de 2 tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-50/70 dark:bg-gray-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-gray-700/70 flex flex-col items-center justify-between space-y-3 min-h-[160px]">
          <div className="w-32 h-20 rounded-full skeleton-shimmer" />
          <div className="w-24 h-6 rounded-md skeleton-shimmer" />
          <div className="w-28 h-3 rounded-md skeleton-shimmer" />
        </div>
        <div className="bg-slate-50/70 dark:bg-gray-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-gray-700/70 flex flex-col items-center justify-between space-y-3 min-h-[160px]">
          <div className="w-24 h-24 rounded-full skeleton-shimmer" />
          <div className="w-20 h-6 rounded-full skeleton-shimmer" />
          <div className="w-28 h-3 rounded-md skeleton-shimmer" />
        </div>
      </div>

      {/* Botón */}
      <div className="w-full h-12 rounded-xl skeleton-shimmer" />
    </div>
  );
};

