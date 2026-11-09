const mongoose = require('mongoose');

const trafficRecordSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  street_name: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  speed_kmh: { type: Number, required: true },
  congestion_level: { type: String, required: true }
});

trafficRecordSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('TrafficRecord', trafficRecordSchema);