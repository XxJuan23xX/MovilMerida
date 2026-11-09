const mongoose = require('mongoose');

const TrafficAnalyticsSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  hour: { type: Number, required: true },
  day_of_week: { type: String, required: true }, // Lunes, Martes, etc.
  zone_name: { type: String, required: true },
  sector: { type: String, required: true },
  average_speed_kmh: { type: Number, required: true },
  congestion_level: { type: String, required: true }, // bajo, moderado, alto, severo
  vehicle_count_estimate: { type: Number, required: true },
  delay_minutes: { type: Number, required: true }
});

module.exports = mongoose.model('TrafficAnalytics', TrafficAnalyticsSchema);