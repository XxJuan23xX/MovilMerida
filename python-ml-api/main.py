from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from pymongo import MongoClient
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from typing import Optional

app = FastAPI(title="MovilMerida - Microservicio de Predicción ML")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = "mongodb+srv://manuelj2321:chocolate04@cluster0.go4rq.mongodb.net/merida_traffic?retryWrites=true&w=majority"

# Lista canónica de las 26 vialidades registradas en MovilMérida
FALLBACK_STREETS = [
    "Anillo Periférico Norte (Zona Altabrisa)",
    "Anillo Periférico Poniente (Caucel)",
    "Anillo Periférico Sur",
    "Anillo Periférico Sur (Kanasín)",
    "Av. Itzáes (Frente al O'Horán)",
    "Avenida 86",
    "Avenida Aviación (Rumbo al Aeropuerto)",
    "Avenida Aviación x Calle 128",
    "Avenida García Lavín x Periférico",
    "Avenida Itzáes x Calle 59",
    "Avenida Jacinto Canek",
    "Avenida Mérida 2000",
    "Calle 33 (Zona Macroplaza)",
    "Calle 59 x Circuito Colonias",
    "Calle 60 Norte (Zona Gran Plaza)",
    "Carretera Mérida - Umán",
    "Centro Histórico",
    "Glorieta de Prolongación Montejo",
    "Glorieta de la Fuente de Piedra",
    "Glorieta de la Paz",
    "Parque Extremo",
    "Periférico Norte - Tramo Prueba",
    "Prolongación Montejo x Periférico Norte",
    "Unidad Deportiva Inalámbrica",
    "Universidad Tecnológica Metropolitana (UTM)",
    "Villa Palmira",
]

DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

# Variables globales en memoria para el modelo entrenado y sus codificadores
_model_cache = {
    "model": None,
    "encoder_street": None,
    "encoder_day": None,
    "streets": [],
}


def get_traffic_records_from_mongo():
    """Lee las vialidades de la colección trafficrecords en MongoDB."""
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=4000)
        db = client["merida_traffic"]
        collection = db["trafficrecords"]
        records = list(collection.find({}, {"_id": 0, "street_name": 1, "speed_kmh": 1, "congestion_level": 1}))
        if records:
            return records
    except Exception as e:
        print(f"Aviso: Conexión con MongoDB diferida ({e}), utilizando catálogo base de vialidades.")
    return [{"street_name": s, "speed_kmh": 45, "congestion_level": "moderado"} for s in FALLBACK_STREETS]


def train_model():
    """Genera el dataset histórico (días x 24 horas x vialidades) y entrena el Random Forest."""
    records = get_traffic_records_from_mongo()
    streets = sorted(list(set(r.get("street_name", "").strip() for r in records if r.get("street_name"))))
    if not streets:
        streets = FALLBACK_STREETS

    training_rows = []
    for r in records:
        street = r.get("street_name", "").strip()
        if not street:
            continue
        name_lower = street.lower()

        is_always_fluid = any(z in name_lower for z in ["villa palmira", "inalámbrica", "inalambrica", "parque extremo"])
        is_airport_utm = any(z in name_lower for z in ["aviación", "universidad tecnológica", "utm", "86", "mérida 2000", "merida 2000"])
        is_congested_artery = any(z in name_lower for z in ["periférico", "periferico", "centro histórico", "itzáes", "glorieta", "macroplaza"])

        for day in DAYS_OF_WEEK:
            is_weekend = day in ["Sábado", "Domingo"]
            for hour in range(24):
                if is_always_fluid:
                    speed = 65.0
                    congestion = "bajo"
                elif is_weekend:
                    # Fines de semana con menor congestión general
                    if 0 <= hour <= 6:
                        speed = 65.0
                        congestion = "bajo"
                    elif 11 <= hour <= 15:
                        speed = 45.0 if is_congested_artery else 55.0
                        congestion = "moderado"
                    else:
                        speed = 50.0 if is_congested_artery else 60.0
                        congestion = "bajo" if speed >= 40 else "moderado"
                else:
                    # Días laborales (Lunes a Viernes) con horas pico marcadas
                    if 0 <= hour <= 5:
                        speed = 65.0
                        congestion = "bajo"
                    elif 6 <= hour <= 8:
                        speed = 22.0 if is_congested_artery else (35.0 if is_airport_utm else 30.0)
                        congestion = "severo" if speed < 25 else "alto"
                    elif 9 <= hour <= 11:
                        speed = 15.0 if is_congested_artery else (28.0 if is_airport_utm else 20.0)
                        congestion = "severo" if speed < 25 else "alto"
                    elif 12 <= hour <= 14:
                        speed = 35.0 if is_congested_artery else (50.0 if is_airport_utm else 45.0)
                        congestion = "alto" if speed < 40 else "moderado"
                    elif 15 <= hour <= 17:
                        speed = 16.0 if is_congested_artery else (25.0 if is_airport_utm else 18.0)
                        congestion = "severo"
                    elif hour == 18:
                        speed = 30.0 if is_congested_artery else (45.0 if is_airport_utm else 40.0)
                        congestion = "alto" if speed < 35 else "moderado"
                    elif 19 <= hour <= 21:
                        speed = 24.0 if is_congested_artery else (38.0 if is_airport_utm else 32.0)
                        congestion = "alto"
                    else:
                        speed = 45.0 if is_congested_artery else 52.0
                        congestion = "moderado"

                training_rows.append({
                    "street_name": street,
                    "day": day,
                    "hour": hour,
                    "speed_kmh": speed,
                    "congestion_level": congestion
                })

    df = pd.DataFrame(training_rows)
    encoder_street = LabelEncoder()
    encoder_day = LabelEncoder()
    df["street_encoded"] = encoder_street.fit_transform(df["street_name"])
    df["day_encoded"] = encoder_day.fit_transform(df["day"])

    # El modelo ahora aprende de la hora, la calle y el día de la semana
    X = df[["hour", "street_encoded", "day_encoded"]]
    y = df["speed_kmh"]

    model = RandomForestRegressor(n_estimators=50, random_state=42)
    model.fit(X, y)

    _model_cache["model"] = model
    _model_cache["encoder_street"] = encoder_street
    _model_cache["encoder_day"] = encoder_day
    _model_cache["streets"] = list(encoder_street.classes_)
    return model, encoder_street, encoder_day, list(encoder_street.classes_)


def get_trained_model():
    if _model_cache["model"] is None:
        train_model()
    return _model_cache["model"], _model_cache["encoder_street"], _model_cache["encoder_day"], _model_cache["streets"]


@app.get("/")
def home():
    return {
        "message": "Microservicio de Predicción MovilMérida activo con FastAPI, Scikit-Learn y MongoDB",
        "status": "ready"
    }


@app.get("/api/ml/streets")
def list_streets():
    """Devuelve las vialidades registradas para selección en el frontend."""
    _, _, _, streets = get_trained_model()
    return {"success": True, "streets": streets, "total": len(streets)}


@app.get("/api/ml/predict")
def predict_traffic(
    hour: int = Query(..., ge=0, le=23, description="Hora del día (0-23)"),
    street: Optional[str] = Query(None, description="Nombre de la calle o avenida"),
    sector: Optional[str] = Query(None, description="Alias compatible por si se envía sector"),
    day: Optional[str] = Query("Lunes", description="Día de la semana")
):
    """
    Endpoint predictivo: Recibe hora, calle y día, y predice la velocidad con Random Forest.
    """
    model, encoder_street, encoder_day, streets = get_trained_model()

    target_street = (street or sector or "").strip()
    if not target_street:
        target_street = streets[0] if streets else "Av. Itzáes (Frente al O'Horán)"

    matched_street = None
    for s in streets:
        if s.lower() == target_street.lower():
            matched_street = s
            break

    if not matched_street:
        for s in streets:
            if target_street.lower() in s.lower() or s.lower() in target_street.lower():
                matched_street = s
                break

    if not matched_street:
        return {
            "success": False,
            "error": f"Vialidad '{target_street}' no reconocida."
        }

    target_day = (day or "Lunes").strip()
    days_list = list(encoder_day.classes_)
    matched_day = "Lunes"
    for d in days_list:
        if d.lower() == target_day.lower():
            matched_day = d
            break

    street_code = encoder_street.transform([matched_street])[0]
    day_code = encoder_day.transform([matched_day])[0]

    # Predicción considerando hora, calle y día
    prediction = model.predict([[hour, street_code, day_code]])
    predicted_speed = float(prediction[0])

    congestion = "bajo"
    if predicted_speed < 25:
        congestion = "severo"
    elif predicted_speed < 40:
        congestion = "alto"
    elif predicted_speed < 60:
        congestion = "moderado"

    return {
        "success": True,
        "query_hour": hour,
        "query_street": matched_street,
        "query_day": matched_day,
        "predicted_average_speed_kmh": round(predicted_speed, 2),
        "estimated_congestion_level": congestion
    }