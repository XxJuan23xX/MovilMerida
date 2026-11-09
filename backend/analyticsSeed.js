const mongoose = require('mongoose');
// Asegúrate de usar tu misma URI de MongoDB Atlas
const MONGO_URI = 'mongodb+srv://manuelj2321:chocolate04@cluster0.go4rq.mongodb.net/merida_traffic?retryWrites=true&w=majority';

const TrafficAnalyticsSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  hour: { type: Number, required: true },
  day_of_week: { type: String, required: true },
  zone_name: { type: String, required: true },
  sector: { type: String, required: true },
  average_speed_kmh: { type: Number, required: true },
  congestion_level: { type: String, required: true },
  vehicle_count_estimate: { type: Number, required: true },
  delay_minutes: { type: Number, required: true }
});

const TrafficAnalytics = mongoose.model('TrafficAnalytics', TrafficAnalyticsSchema);

const zones = [
  { zone_name: "Sector Centro Histórico", sector: "Centro" },
  { zone_name: "Prolongación Montejo x Periférico Norte", sector: "Norte" },
  { zone_name: "Anillo Periférico Sur (Kanasín)", sector: "Sur" },
  { zone_name: "Avenida Jacinto Canek", sector: "Poniente" },
  { zone_name: "Anillo Periférico Norte (Altabrisa)", sector: "Oriente" },
  { zone_name: "Avenida Aviación (Aeropuerto)", sector: "Sur-Poniente" }
];

const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const generateAnalyticsData = () => {
  let records = [];
  const totalRecordsTarget = 1500; // Supera la meta de los 1,000 para excelente volumen en Power BI
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // Historial de los últimos 30 días

  for (let i = 0; i < totalRecordsTarget; i++) {
    // Distribuir aleatoriamente las fechas y horas en el último mes
    let randomDate = new Date(startDate.getTime() + Math.random() * (new Date().getTime() - startDate.getTime()));
    let hour = randomDate.getHours();
    let dayOfWeek = daysOfWeek[randomDate.getDay()];
    let zoneObj = zones[Math.floor(Math.random() * zones.length)];

    // Lógica inteligente de tráfico basada en hora pico
    let isRushHour = (hour >= 7 && hour <= 9) || (hour >= 18 && hour <= 20);
    let speed, congestion, vehicles, delay;

    if (isRushHour) {
      speed = Math.floor(Math.random() * 20) + 15; // 15 - 35 km/h (lento)
      congestion = speed < 22 ? "severo" : "alto";
      vehicles = Math.floor(Math.random() * 400) + 600; // 600 - 1000 autos
      delay = Math.floor(Math.random() * 25) + 15; // 15 - 40 min demora
    } else if (hour >= 0 && hour <= 5) {
      speed = Math.floor(Math.random() * 20) + 60; // 60 - 80 km/h (muy fluido)
      congestion = "bajo";
      vehicles = Math.floor(Math.random() * 100) + 50; // 50 - 150 autos
      delay = Math.floor(Math.random() * 3); // 0 - 2 min demora
    } else {
      speed = Math.floor(Math.random() * 25) + 35; // 35 - 60 km/h (moderado)
      congestion = "moderado";
      vehicles = Math.floor(Math.random() * 300) + 300; // 300 - 600 autos
      delay = Math.floor(Math.random() * 10) + 5; // 5 - 15 min demora
    }

    records.push({
      timestamp: randomDate,
      hour: hour,
      day_of_week: dayOfWeek,
      zone_name: zoneObj.zone_name,
      sector: zoneObj.sector,
      average_speed_kmh: speed,
      congestion_level: congestion,
      vehicle_count_estimate: vehicles,
      delay_minutes: delay
    });
  }

  return records;
};

const runAnalyticsSeed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Conectado a MongoDB Atlas para seed analítico...");

    // Limpiar colección analítica previa si existe
    await TrafficAnalytics.deleteMany({});
    console.log("Colección analítica anterior limpiada.");

    const data = generateAnalyticsData();
    await TrafficAnalytics.insertMany(data);

    console.log(`¡Éxito! Se han insertado ${data.length} registros históricos en la colección 'trafficanalytics'.`);
    mongoose.connection.close();
  } catch (error) {
    console.error("Error al sembrar datos analíticos:", error);
    mongoose.connection.close();
  }
};

runAnalyticsSeed();