const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://manuelj2321:chocolate04@cluster0.go4rq.mongodb.net/merida_traffic?retryWrites=true&w=majority');
const TrafficRecord = require('./src/models/TrafficRecord');

// Nodos de sensores de tráfico en intersecciones clave de Mérida (Coordenadas Reales)
const meridaNodes = [
  { 
    street_name: "Av. Itzáes (Frente al O'Horán)", 
    lat: 20.974653848993956, 
    lng: -89.64026494246160, 
    speed_kmh: 25, 
    congestion_level: "alto" 
  },
  { 
    street_name: "Prolongación Montejo x Periférico Norte", 
    lat: 21.023194426733365, 
    lng: -89.62094779806804, 
    speed_kmh: 35, 
    congestion_level: "alto" 
  },
  { 
    street_name: "Calle 60 Norte (Zona Gran Plaza)", 
    lat: 21.035740713186590, 
    lng: -89.62304174099785, 
    speed_kmh: 45, 
    congestion_level: "moderado" 
  },
  { 
    street_name: "Anillo Periférico Norte (Zona Altabrisa)", 
    lat: 21.027022136052434, 
    lng: -89.57172760274547, 
    speed_kmh: 75, 
    congestion_level: "bajo" 
  },
  { 
    street_name: "Avenida García Lavín x Periférico", 
    lat: 21.036404057535960, 
    lng: -89.60265929652151, 
    speed_kmh: 50, 
    congestion_level: "bajo" 
  },
  { 
    street_name: "Anillo Periférico Sur (Kanasín)", 
    lat: 20.952201194876740, 
    lng: -89.56834521158193, 
    speed_kmh: 28, 
    congestion_level: "alto" 
  },
  { 
    street_name: "Anillo Periférico Poniente (Caucel)", 
    lat: 20.995253713209628, 
    lng: -89.67328808899838, 
    speed_kmh: 65, 
    congestion_level: "bajo" 
  },
  { 
    street_name: "Avenida Jacinto Canek", 
    lat: 20.987078978046720, 
    lng: -89.65953845923096, 
    speed_kmh: 40, 
    congestion_level: "moderado" 
  },
  { 
    street_name: "Glorieta de Prolongación Montejo", 
    lat: 20.989968896506884, 
    lng: -89.61687989820796, 
    speed_kmh: 18, 
    congestion_level: "severo" 
  },
  { 
    street_name: "Glorieta de la Paz", 
    lat: 20.998876743376630, 
    lng: -89.61592563584330, 
    speed_kmh: 30, 
    congestion_level: "moderado" 
  },
  { 
    street_name: "Centro Histórico", 
    lat: 20.968382392735485, 
    lng: -89.62213794837830, 
    speed_kmh: 15, 
    congestion_level: "severo" 
  },
  { 
    street_name: "Avenida Aviación (Rumbo al Aeropuerto)", 
    lat: 20.943567737312243, 
    lng: -89.65794108009156, 
    speed_kmh: 55, 
    congestion_level: "bajo" 
  },
{ 
    street_name: "Carretera Mérida - Umán", 
    lat: 20.928455143723724, 
    lng: -89.68079845900432, 
    speed_kmh: 35, 
    congestion_level: "alto" 
  },
  { 
    street_name: "Calle 59 x Circuito Colonias", 
    lat: 20.965090232949738, 
    lng: -89.58824791077112, 
    speed_kmh: 40, 
    congestion_level: "moderado" 
  },
  { 
    street_name: "Avenida Itzáes x Calle 59", 
    lat: 20.971376643316624, 
    lng: -89.63985506262725, 
    speed_kmh: 22, 
    congestion_level: "alto" 
  },
  { 
    street_name: "Anillo Periférico Sur", 
    lat: 20.911861130663002, 
    lng: -89.62034745019986, 
    speed_kmh: 60, 
    congestion_level: "bajo" 
  },
  { 
    street_name: "Avenida Aviación x Calle 128", 
    lat: 20.936660829551975, 
    lng: -89.66900745713744, 
    speed_kmh: 45, 
    congestion_level: "moderado" 
  },
  { 
    street_name: "Avenida Mérida 2000", 
    lat: 20.961110625388340, 
    lng: -89.66322091866343, 
    speed_kmh: 40, 
    congestion_level: "moderado" 
  },
  { 
    street_name: "Universidad Tecnológica Metropolitana (UTM)", 
    lat: 20.93849934202068, 
    lng: -89.6157759885108, 
    speed_kmh: 40, 
    congestion_level: "moderado" 
  },
  { 
    street_name: "Avenida 86", 
    lat: 20.922030707088048, 
    lng: -89.64543776875796, 
    speed_kmh: 45, 
    congestion_level: "moderado" 
  },
  { 
    street_name: "Calle 33 (Zona Macroplaza)", 
    lat: 21.000046700257275, 
    lng: -89.57249017543029, 
    speed_kmh: 25, 
    congestion_level: "alto" 
  },
  { 
    street_name: "Glorieta de la Fuente de Piedra", 
    lat: 21.023361441523974, 
    lng: -89.64941825912102, 
    speed_kmh: 30, 
    congestion_level: "alto" 
  },
  { 
    street_name: "Villa Palmira", 
    lat: 20.94324340225314, 
    lng: -89.63001455382629, 
    speed_kmh: 65, 
    congestion_level: "bajo" 
  },
  { 
    street_name: "Unidad Deportiva Inalámbrica", 
    lat: 20.982399698919043, 
    lng: -89.64605216944194, 
    speed_kmh: 65, 
    congestion_level: "bajo" 
  },
  { 
    street_name: "Parque Extremo", 
    lat: 20.983742135784805, 
    lng: -89.67107440498629, 
    speed_kmh: 65, 
    congestion_level: "bajo" 
  }
];

const seedDB = async () => {
  try {
    await TrafficRecord.deleteMany({});
    console.log("Base de datos limpia.");

    let batchData = meridaNodes.map(node => ({
      street_name: node.street_name,
      speed_kmh: node.speed_kmh,
      congestion_level: node.congestion_level,
      location: {
        type: 'Point',
        coordinates: [node.lng, node.lat] // [longitud, latitud] (Estándar GeoJSON)
      },
      timestamp: new Date()
    }));

    await TrafficRecord.insertMany(batchData);
    console.log(`¡${batchData.length} nodos de sensores viales con coordenadas reales insertados con éxito!`);
    mongoose.connection.close();
  } catch (error) {
    console.error("Error al sembrar:", error);
    mongoose.connection.close();
  }
};

seedDB();