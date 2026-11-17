from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from pymongo import MongoClient
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from typing import Optional
import re
import unicodedata
from datetime import datetime

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
    features_df = pd.DataFrame([[hour, street_code, day_code]], columns=["hour", "street_encoded", "day_encoded"])
    prediction = model.predict(features_df)
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

def normalize_text(text: str) -> str:
    """Normaliza texto eliminando acentos, abreviaturas comunes y espacios sobrantes."""
    if not text:
        return ""
    text = text.lower().strip()
    text = re.sub(r'\bav\.?\s+|\bavenida\s+', 'avenida ', text)
    text = re.sub(r'\bc\.?\s+|\bcalle\s+', 'calle ', text)
    text = re.sub(r'\b(perife|perif)\b', 'periferico', text)
    # Eliminar diacríticos/acentos (á->a, é->e, etc.)
    text = ''.join(
        c for c in unicodedata.normalize('NFD', text)
        if unicodedata.category(c) != 'Mn'
    )
    return text


def detect_street(norm_text: str, streets: list) -> Optional[str]:
    """Detecta de forma inteligente y exacta cualquiera de las 26 arterias viales de Mérida."""
    if not norm_text:
        return None

    # 1. Caucel / Periférico Poniente
    if re.search(r'\b(caucel|periferico poniente)\b', norm_text):
        return "Anillo Periférico Poniente (Caucel)"
    
    # 2. Kanasín / Periférico Sur Kanasín
    if re.search(r'\b(kanasin)\b', norm_text):
        return "Anillo Periférico Sur (Kanasín)"
        
    # 3. Periférico Sur general
    if re.search(r'\b(periferico sur)\b', norm_text):
        return "Anillo Periférico Sur"
        
    # 4. Altabrisa / Periférico Norte Altabrisa
    if re.search(r'\b(altabrisa)\b', norm_text):
        return "Anillo Periférico Norte (Zona Altabrisa)"

    # 5. García Lavín
    if re.search(r'\b(garcia lavin|lavin)\b', norm_text):
        return "Avenida García Lavín x Periférico"

    # 6. Prolongación Montejo
    if "montejo" in norm_text:
        if "periferico" in norm_text:
            return "Prolongación Montejo x Periférico Norte"
        return "Glorieta de Prolongación Montejo"

    # 7. Itzáes (con o sin acento gracias a normalize_text)
    if re.search(r'\b(itzaes|ohoran|o horan|horan)\b', norm_text):
        if "59" in norm_text or "calle 59" in norm_text:
            return "Avenida Itzáes x Calle 59"
        return "Av. Itzáes (Frente al O'Horán)"

    # 8. Aviación / Aeropuerto
    if re.search(r'\b(aeropuerto|aviacion)\b', norm_text):
        if "128" in norm_text or "calle 128" in norm_text:
            return "Avenida Aviación x Calle 128"
        return "Avenida Aviación (Rumbo al Aeropuerto)"

    # 9. Avenida 86
    if re.search(r'\b(86|avenida 86|calle 86)\b', norm_text):
        return "Avenida 86"

    # 10. Jacinto Canek
    if re.search(r'\b(canek|jacinto canek)\b', norm_text):
        return "Avenida Jacinto Canek"

    # 11. Mérida 2000
    if re.search(r'\b(merida 2000)\b', norm_text):
        return "Avenida Mérida 2000"

    # 12. Macroplaza / Calle 33
    if re.search(r'\b(macroplaza|calle 33|macro plaza)\b', norm_text):
        return "Calle 33 (Zona Macroplaza)"

    # 13. Calle 59 x Circuito Colonias
    if "circuito" in norm_text or "colonias" in norm_text:
        return "Calle 59 x Circuito Colonias"
    if re.search(r'\b(calle 59|59)\b', norm_text):
        return "Calle 59 x Circuito Colonias"

    # 14. Calle 60 Norte / Gran Plaza
    if re.search(r'\b(gran plaza|calle 60|60 norte)\b', norm_text):
        return "Calle 60 Norte (Zona Gran Plaza)"

    # 15. Carretera Mérida - Umán
    if re.search(r'\b(uman|carretera uman)\b', norm_text):
        return "Carretera Mérida - Umán"

    # 16. Centro Histórico
    if re.search(r'\b(centro|centro historico)\b', norm_text):
        return "Centro Histórico"

    # 17. Glorieta de la Paz
    if re.search(r'\b(glorieta de la paz|la paz|monumento a la patria)\b', norm_text):
        return "Glorieta de la Paz"

    # 18. Fuente de Piedra
    if re.search(r'\b(fuente de piedra|glorieta de la fuente)\b', norm_text):
        return "Glorieta de la Fuente de Piedra"

    # 19. Parque Extremo
    if re.search(r'\b(parque extremo)\b', norm_text):
        return "Parque Extremo"

    # 20. Inalámbrica
    if re.search(r'\b(inalambrica|deportiva inalambrica)\b', norm_text):
        return "Unidad Deportiva Inalámbrica"

    # 21. UTM
    if re.search(r'\b(utm|universidad tecnologica)\b', norm_text):
        return "Universidad Tecnológica Metropolitana (UTM)"

    # 22. Villa Palmira
    if re.search(r'\b(villa palmira|palmira)\b', norm_text):
        return "Villa Palmira"

    # 23. Periférico Norte general
    if re.search(r'\b(periferico norte)\b', norm_text):
        return "Anillo Periférico Norte (Zona Altabrisa)"

    # 24. Periférico general
    if "periferico" in norm_text:
        return "Anillo Periférico Norte (Zona Altabrisa)"

    # 25. Búsqueda por palabras significativas dentro de la lista de calles
    for s in streets:
        s_norm = normalize_text(s)
        words = [w for w in s_norm.split() if len(w) > 3 and w not in ["zona", "frente", "tramo", "calle", "avenida", "anillo"]]
        for w in words:
            if re.search(r'\b' + re.escape(w) + r'\b', norm_text):
                return s

    return None


def extract_hour(norm_text: str) -> Optional[int]:
    """Extrae la hora consultada soportando lenguaje natural (mediodía, tarde, am/pm, etc.)."""
    if not norm_text:
        return None

    # 1. Búsqueda numérica prioritaria con AM / PM explícito (ej. '12 am', '11:00 am', '6 pm')
    m_ampm = re.search(r'\b(\d{1,2})(?::\d{2})?\s*(am|pm)\b', norm_text)
    if m_ampm:
        h = int(m_ampm.group(1))
        meridiem = m_ampm.group(2)
        if h == 12:
            # En habla común '12 am' se suele usar como mediodía (12:00) a menos que diga noche/madrugada
            h = 0 if any(w in norm_text for w in ["noche", "madrugada"]) else 12
        elif meridiem == 'pm' and h < 12:
            h += 12
        elif meridiem == 'am' and h == 12:
            h = 0
        if 0 <= h <= 23:
            return h

    # 2. Formato numérico explícito (ej. 'a las 12', 'las 11', '14 hrs', '14:00')
    m_hours = re.search(r'(?:a las|las)\s*(\d{1,2})(?::\d{2})?\b|\b(\d{1,2})\s*(?:hrs?|horas?)\b|\b(\d{1,2}):\d{2}\b', norm_text)
    if m_hours:
        for idx in range(1, 4):
            val = m_hours.group(idx)
            if val:
                h = int(val)
                # Ajuste de tarde/noche si no venía en formato 24h
                if any(w in norm_text for w in ["tarde", "noche"]) and 1 <= h <= 11:
                    h += 12
                if 0 <= h <= 23:
                    return h

    # 3. Palabras clave descriptivas (solo si no se especificó un número)
    if any(w in norm_text for w in ["mediodia", "12 del dia", "almuerzo"]):
        return 12
    if any(w in norm_text for w in ["madrugada", "3 am", "3 de la manana"]):
        return 3
    if any(w in norm_text for w in ["en la manana", "por la manana", "temprano"]):
        return 8
    if any(w in norm_text for w in ["en la tarde", "por la tarde", "atardecer", "salida escolar"]):
        return 14
    if any(w in norm_text for w in ["hora pico", "pico", "salida de oficinas"]):
        return 18
    if any(w in norm_text for w in ["en la noche", "por la noche", "medianoche", "cena"]):
        return 21

    return None


def extract_day(norm_text: str) -> Optional[str]:
    """Extrae el día de la semana o calcula según referencias relativas (hoy, mañana)."""
    if not norm_text:
        return None

    days_map = {
        "lunes": "Lunes", "martes": "Martes", "miercoles": "Miércoles",
        "jueves": "Jueves", "viernes": "Viernes", "sabado": "Sábado", "domingo": "Domingo"
    }
    for key, val in days_map.items():
        if re.search(r'\b' + key + r'\b', norm_text):
            return val

    weekdays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    if "hoy" in norm_text:
        return weekdays[datetime.now().weekday()]
    if "manana" in norm_text:
        return weekdays[(datetime.now().weekday() + 1) % 7]
    if "fin de semana" in norm_text:
        return "Sábado"

    return None


@app.post("/api/ml/chat")
def traffic_chat(payload: dict):
    """
    Endpoint conversacional de IA:
    Normaliza acentos, extrae de forma robusta la vialidad, hora y día,
    aplica memoria de contexto conversacional y ejecuta el modelo Random Forest.
    """
    message = payload.get("message", "").strip()
    history = payload.get("history", [])

    if not message or len(message) < 2:
        return {
            "success": True, 
            "response": "Por favor, escribe una pregunta válida sobre el tráfico en Mérida."
        }

    norm_message = normalize_text(message)
    model, encoder_street, encoder_day, streets = get_trained_model()

    # 1. Recuperar contexto previo de la conversación si existe
    last_street = None
    last_day = None
    last_hour = None

    if history and isinstance(history, list):
        for h in reversed(history):
            if not last_street and h.get("street"):
                last_street = h.get("street")
            if not last_day and h.get("day"):
                last_day = h.get("day")
            if last_hour is None and h.get("hour") is not None:
                last_hour = h.get("hour")
            # Si no viene en params, buscar en el texto de mensajes anteriores
            if not last_street and h.get("text"):
                st_in_text = detect_street(normalize_text(h.get("text", "")), streets)
                if st_in_text:
                    last_street = st_in_text

    # 2. Extracción de Parámetros en el Mensaje Actual
    matched_street = detect_street(norm_message, streets)
    extracted_h = extract_hour(norm_message)
    extracted_d = extract_day(norm_message)

    # 3. Clasificación de Intención y Filtro Fuera de Dominio (Off-Topic)
    has_explicit_street = bool(matched_street)

    has_traffic_intent = any(kw in norm_message for kw in [
        "trafico", "transito", "congestion", "velocidad", "embotellamiento",
        "retencion", "saturacion", "demora", "retraso", "flujo vehicular",
        "ruta", "vialidad", "vial", "carril", "manejar", "carretera", "como esta el trafico",
        "como estara el trafico", "hay trafico", "mucho trafico"
    ])

    # Un seguimiento temporal requiere que haya una calle previa en el historial
    # Y que el mensaje actual contenga una HORA o un DÍA explícito (ej. 'y al mediodia', 'y a las 6 pm', 'y mañana')
    is_temporal_followup = bool(last_street) and (extracted_h is not None or extracted_d is not None)

    # Detección de mensajes conversacionales
    is_pure_greeting = any(
        norm_message == g or norm_message.startswith(g + " ")
        for g in ["hola", "buenos dias", "buenas tardes", "buenas noches", "que tal", "saludos", "hey"]
    )

    is_bot_inquiry = any(p in norm_message for p in [
        "quien eres", "como te llamas", "que eres", "quien te creo", "que haces", "que puedes hacer",
        "eres una ia", "eres un bot", "eres humano", "tu nombre"
    ])

    is_gratitude_or_bye = any(
        norm_message == g or norm_message.startswith(g + " ")
        for g in ["gracias", "muchas gracias", "mil gracias", "adios", "hasta luego", "nos vemos", "chao", "bye"]
    )

    # 3a. Respuestas específicas a cortesía o identidad
    if is_bot_inquiry:
        return {
            "success": True,
            "response": "Soy el asistente inteligente de MovilMérida. Mi función exclusiva es ayudarte a consultar y predecir el tráfico, velocidades y niveles de congestión en las vialidades de Mérida, Yucatán."
        }

    if is_gratitude_or_bye:
        return {
            "success": True,
            "response": "¡Con gusto! Recuerda que puedes consultarme el tráfico de cualquier calle o avenida de Mérida en cualquier momento. ¡Maneja con precaución!"
        }

    if is_pure_greeting and not (has_explicit_street or has_traffic_intent or is_temporal_followup):
        return {
            "success": True,
            "response": "¡Hola! Soy tu asistente inteligente de MovilMérida. Pregúntame sobre el estado del tráfico, horas pico o vialidades de la ciudad (por ejemplo: '¿Cómo estará Av. Itzáes a las 11 am?' o 'Periférico Norte al mediodía')."
        }

    # 3b. Validación estricta: Si la pregunta no menciona calle, ni intención de tráfico, ni es seguimiento temporal
    is_valid_traffic_request = has_explicit_street or has_traffic_intent or is_temporal_followup

    if not is_valid_traffic_request:
        return {
            "success": True,
            "response": "Una disculpa, solo puedo contestar preguntas referentes al tráfico vial, velocidades y movilidad en Mérida, Yucatán. Por favor, hazme una consulta sobre alguna calle, avenida o sector (por ejemplo: Periférico, Av. Itzáes, Caucel o Centro Histórico)."
        }

    # 4. Asignación final con resolución de contexto
    if not matched_street:
        matched_street = last_street or "Centro Histórico"

    if extracted_h is not None:
        hour = extracted_h
    elif last_hour is not None and is_temporal_followup:
        hour = last_hour
    else:
        hour = 8

    weekdays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    current_day = weekdays[datetime.now().weekday()]
    if extracted_d is not None:
        day = extracted_d
    elif last_day is not None and is_temporal_followup:
        day = last_day
    else:
        day = current_day

    # 5. Procesamiento con Machine Learning (Random Forest)
    try:
        street_code = encoder_street.transform([matched_street])[0]
        day_code = encoder_day.transform([day])[0]
        features_df = pd.DataFrame([[hour, street_code, day_code]], columns=["hour", "street_encoded", "day_encoded"])
        prediction = model.predict(features_df)
        predicted_speed = float(prediction[0])
    except Exception as e:
        print("Error al predecir con el modelo:", e)
        predicted_speed = 32.0

    congestion = "bajo"
    if predicted_speed < 25:
        congestion = "severo"
    elif predicted_speed < 40:
        congestion = "alto"
    elif predicted_speed < 60:
        congestion = "moderado"

    # 6. Construcción de una respuesta natural, limpia y precisa
    time_str = f"{hour:02d}:00 hrs"
    
    response_text = (
        f"Para el {day} a las {time_str} en {matched_street}, "
        f"estimamos una velocidad promedio de {round(predicted_speed, 1)} km/h "
        f"con un nivel de congestión {congestion}."
    )

    if congestion == "severo":
        response_text += " Te sugiero tomar precauciones o buscar rutas alternas, ya que se espera bastante retención."
    elif congestion == "alto":
        response_text += " Habrá circulación algo densa en la zona."
    elif congestion == "moderado":
        response_text += " El flujo vehicular será constante y con demoras menores."
    else:
        response_text += " Las condiciones de tránsito se esperan fluidas y despejadas."

    return {
        "success": True,
        "query_message": message,
        "extracted_params": {
            "street": matched_street,
            "day": day,
            "hour": hour
        },
        "prediction": {
            "predicted_average_speed_kmh": round(predicted_speed, 1),
            "estimated_congestion_level": congestion
        },
        "response": response_text
    }