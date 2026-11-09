const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const trafficRoutes = require('./src/routes/trafficRoutes'); // <-- Corregido con la ruta correcta

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('🟢 Conectado exitosamente a MongoDB Atlas'))
  .catch((err) => console.error('🔴 Error de conexión a MongoDB:', err));

// Registrar Rutas de la API
app.use('/api/traffic', trafficRoutes); // <-- Usar rutas

app.get('/', (req, res) => {
  res.json({ mensaje: 'API de Tráfico de Mérida funcionando correctamente 🚗💨' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});