const TrafficRecord = require('../models/TrafficRecord'); // Ajusta la ruta según tu estructura

// Función para determinar el estado de tráfico según una hora específica (o la actual de Mérida) y el tipo de vía
const getSimulatedTrafficByHour = (streetName = '', customHour = null) => {
  let hour = customHour;

  // Si no se pasa una hora personalizada, obtenemos la hora actual en Mérida, Yucatán
  if (hour === null) {
    const options = { timeZone: 'America/Merida', hour: 'numeric', hour12: false };
    const hourStr = new Intl.DateTimeFormat('en-US', options).format(new Date());
    hour = parseInt(hourStr, 10);
  }

  let level = 'bajo';
  let speed = 60;

  // 1. Zonas que SIEMPRE se mantienen fluidas (Villa Palmira, Inalámbrica, Parque Extremo)
  const nameLower = (streetName || '').toLowerCase();
  if (nameLower.includes('villa palmira') || nameLower.includes('inalámbrica') || nameLower.includes('inalambrica') || nameLower.includes('parque extremo')) {
    return { hour, level: 'bajo', speed: 65 };
  }

  // 2. Aplicando las reglas de horario base para el resto de la ciudad:
  if ((hour >= 0 && hour <= 2) || (hour >= 3 && hour <= 5)) {
    // 12 AM - 5 AM -> Fluido / Bajo
    level = 'bajo';
    speed = 65;
  } else if (hour >= 6 && hour <= 8) {
    // 6 AM - 8 AM -> Alto
    level = 'alto';
    speed = 30;
  } else if (hour >= 9 && hour <= 11) {
    // 9 AM - 11 AM -> Severo
    level = 'severo';
    speed = 15;
  } else if (hour >= 12 && hour <= 14) {
    // 12 PM - 2 PM -> Moderado
    level = 'moderado';
    speed = 45;
  } else if (hour >= 15 && hour <= 17) {
    // 3 PM - 5 PM -> Severo
    level = 'severo';
    speed = 18;
  } else if (hour === 18) {
    // Transición de las 6 PM -> Moderado/Alto
    level = 'moderado';
    speed = 40;
  } else if (hour >= 19 && hour <= 21) {
    // 7 PM - 9 PM -> Alto
    level = 'alto';
    speed = 32;
  } else if (hour >= 22 && hour <= 23) {
    // 10 PM - 11 PM -> Moderado
    level = 'moderado';
    speed = 50;
  }

  // 3. EXCEPCIONES Y VARIACIONES POR ZONA / CALLE
  if (nameLower.includes('aviación') || nameLower.includes('universidad tecnológica') || nameLower.includes('utm') || nameLower.includes('86') || nameLower.includes('mérida 2000') || nameLower.includes('merida 2000')) {
    if (level === 'severo') { level = 'alto'; speed = 25; }
    else if (level === 'alto') { level = 'moderado'; speed = 40; }
    else if (level === 'moderado') { level = 'bajo'; speed = 55; }
  }

  if ((nameLower.includes('periférico') || nameLower.includes('periferico') || nameLower.includes('centro histórico')) && (level === 'alto' || level === 'severo')) {
    level = 'severo';
    speed = 15;
  }

  return { hour, level, speed };
};

// 1. Insertar un registro de tráfico
const createTrafficRecord = async (req, res) => {
  try {
    const { timestamp, street_name, coordinates, lat, lng, speed_kmh, congestion_level } = req.body;

    const coords = coordinates || (lat && lng ? [lng, lat] : null);
    if (!coords) {
      return res.status(400).json({ success: false, error: 'Coordenadas requeridas [lng, lat] o lat y lng' });
    }

    const newRecord = new TrafficRecord({
      timestamp: timestamp || new Date(),
      street_name,
      location: {
        type: 'Point',
        coordinates: coords
      },
      speed_kmh: speed_kmh || 50,
      congestion_level: congestion_level || 'moderado'
    });

    const savedRecord = await newRecord.save();
    res.status(201).json({ success: true, data: savedRecord });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 2. Controlador para obtener los datos del mapa (Tiempo Real y Histórico de las Últimas 3 Horas)
const getTrafficHeatmap = async (req, res) => {
  try {
    const records = await TrafficRecord.find({});
    
    // Obtener la hora actual exacta en Mérida
    const options = { timeZone: 'America/Merida', hour: 'numeric', hour12: false };
    const currentHour = parseInt(new Intl.DateTimeFormat('en-US', options).format(new Date()), 10);

    // Definir las 3 horas del modo histórico: [Hace 2 horas, Hace 1 hora, Hora Actual]
    const hourMinus2 = (currentHour - 2 + 24) % 24;
    const hourMinus1 = (currentHour - 1 + 24) % 24;
    const hourCurrent = currentHour;

    const generateRecordsForHour = (targetHour) => {
      return records.map(record => {
        const [lng, lat] = record.location?.coordinates || [0, 0];
        const nodeSimulation = getSimulatedTrafficByHour(record.street_name, targetHour);

        return {
          _id: record._id,
          lat,
          lng,
          street: record.street_name,
          speed: nodeSimulation.speed,
          congestion: nodeSimulation.level,
          intensity: nodeSimulation.level === 'severo' ? 1.0 : nodeSimulation.level === 'alto' ? 0.8 : nodeSimulation.level === 'moderado' ? 0.5 : 0.3
        };
      });
    };

    // Estructuras de datos para ambos modos
    const realtimeData = generateRecordsForHour(currentHour);
    const baseSimulation = getSimulatedTrafficByHour('', currentHour);

    const historicalData = {
      hourMinus2: {
        hour: hourMinus2,
        label: `${hourMinus2}:00 hrs`,
        data: generateRecordsForHour(hourMinus2)
      },
      hourMinus1: {
        hour: hourMinus1,
        label: `${hourMinus1}:00 hrs`,
        data: generateRecordsForHour(hourMinus1)
      },
      hourCurrent: {
        hour: hourCurrent,
        label: `${hourCurrent}:00 hrs (Actual)`,
        data: generateRecordsForHour(hourCurrent)
      }
    };

    const meridaTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Merida',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date());

    res.status(200).json({
      success: true,
      count: realtimeData.length,
      meridaLocalHour: baseSimulation.hour,
      meridaTime,
      activeSimulationRule: baseSimulation.level,
      data: realtimeData,
      historical: historicalData // Se añade el paquete con las últimas 3 horas
    });
  } catch (error) {
    console.error("Error al obtener datos simulados de tráfico:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Analítica de horas pico (Big Data)
const getPeakHoursMetrics = async (req, res) => {
  try {
    const records = await TrafficRecord.find({});
    const simulation = getSimulatedTrafficByHour();

    res.status(200).json({
      success: true,
      data: {
        totalSensors: records.length,
        currentHour: simulation.hour,
        status: simulation.level,
        averageSpeed: simulation.speed,
        peakHours: [
          { period: "7:00 AM - 9:00 AM", level: "alto" },
          { period: "9:00 AM - 11:00 AM", level: "severo" },
          { period: "1:00 PM - 3:00 PM", level: "moderado" },
          { period: "3:00 PM - 5:00 PM", level: "severo" },
          { period: "7:00 PM - 9:00 PM", level: "alto" }
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  createTrafficRecord,
  getTrafficHeatmap,
  getHeatmapData: getTrafficHeatmap,
  getPeakHoursMetrics
};