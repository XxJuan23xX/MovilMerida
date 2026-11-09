const express = require('express');
const router = express.Router();
const { 
  createTrafficRecord, 
  getTrafficHeatmap, 
  getPeakHoursMetrics 
} = require('../controllers/trafficController');

// Rutas de la API de tráfico de Mérida
router.post('/', createTrafficRecord);           // POST: Registrar punto de tráfico
router.get('/heatmap', getTrafficHeatmap);       // GET: Mapa y mapa de calor con simulación
router.get('/peak-hours', getPeakHoursMetrics);  // GET: Analítica de horas pico

module.exports = router;