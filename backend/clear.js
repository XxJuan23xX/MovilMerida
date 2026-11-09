const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/movil_merida');

const clearDB = async () => {
  try {
    // Apuntamos correctamente a la carpeta src/models
    const TrafficRecord = require('./src/models/TrafficRecord');
    const result = await TrafficRecord.deleteMany({});
    console.log(`¡Listo! Se eliminaron ${result.deletedCount} registros antiguos de la base de datos.`);
    mongoose.connection.close();
  } catch (error) {
    console.error("Error al limpiar la base de datos:", error);
    mongoose.connection.close();
  }
};

clearDB();