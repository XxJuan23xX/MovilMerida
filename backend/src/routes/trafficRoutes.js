const express = require('express');
const router = express.Router();
const { 
  createTrafficRecord, 
  getTrafficHeatmap, 
  getPeakHoursMetrics,
  getTrafficAnalytics,
  exportTrafficAnalyticsCSV
} = require('../controllers/trafficController');

// Rutas de la API de tráfico de Mérida
router.post('/', createTrafficRecord);           // POST: Registrar punto de tráfico
router.get('/heatmap', getTrafficHeatmap);       // GET: Mapa y mapa de calor con simulación
router.get('/peak-hours', getPeakHoursMetrics);  // GET: Analítica de horas pico
router.get('/analytics', getTrafficAnalytics);   // GET: 1,500 registros analíticos históricos en JSON
router.get('/analytics/csv', exportTrafficAnalyticsCSV); // GET: Descarga directa en CSV

module.exports = router;