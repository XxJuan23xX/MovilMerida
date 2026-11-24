import { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  Send,
  Bot,
  User,
  ArrowRight,
  RotateCcw,
  ArrowDown,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import chatiaImg from "../assets/chatia.png";

// Generador de IDs secuenciales para evitar llamadas impuras a Date.now o Math.random
let messageSeqId = 0;
const generateMessageId = () => {
  messageSeqId += 1;
  return `msg_${messageSeqId}`;
};

// Componente que produce el efecto progresivo de máquina de escribir (Typewriter)
const TypewriterText = ({ text, onComplete, onScroll }) => {
  const [displayedText, setDisplayedText] = useState("");
  const onCompleteRef = useRef(onComplete);
  const onScrollRef = useRef(onScroll);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onScrollRef.current = onScroll;
  }, [onComplete, onScroll]);

  useEffect(() => {
    if (!text) {
      onCompleteRef.current?.();
      return;
    }

    let currentIndex = 0;
    // Si el texto es largo aumentamos la cadencia de caracteres para una experiencia ágil
    const step = text.length > 250 ? 2 : 1;
    const intervalSpeed = 16; // ~60fps fluido

    const timer = setInterval(() => {
      currentIndex += step;
      if (currentIndex >= text.length) {
        setDisplayedText(text);
        clearInterval(timer);
        onCompleteRef.current?.();
      } else {
        setDisplayedText(text.slice(0, currentIndex));
        onScrollRef.current?.();
      }
    }, intervalSpeed);

    return () => clearInterval(timer);
  }, [text]);

  const isTyping = displayedText.length < text.length;

  return (
    <span className="whitespace-pre-line leading-relaxed">
      {displayedText}
      {isTyping && (
        <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-emerald-500 dark:bg-emerald-400 rounded-xs animate-cursor-blink align-middle" />
      )}
    </span>
  );
};

const PredictionView = ({ isExpanded = false }) => {
  // Estado de conectividad para modo offline
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Inicializamos sin mensajes para que muestre la vista de bienvenida limpia
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const chatContainerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Sugerencias rápidas para el inicio
  const suggestions = [
    "¿Qué consejos me das para evitar el tráfico en Mérida?",
    "¿Cómo está el tráfico en Periférico Norte a las 8 am?",
    "Dame recomendaciones para circular por el Centro Histórico",
    "¿Qué tal la Av. Itzáes los lunes a las 9 am?",
  ];

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    // Si el usuario se aleja más de 90px del fondo, mostramos la flecha hacia abajo estilo Gemini
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 90;
    setShowScrollBottom(isFarFromBottom);
  };

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    // Si no hay conexión, activar modo offline
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOnline(false);
      return;
    }

    const queryText = textToSend || input;
    if (!queryText.trim()) return;

    const userMessage = {
      id: generateMessageId(),
      sender: "user",
      text: queryText,
      animated: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const API_URL = import.meta.env.VITE_ML_API_URL || "https://movilmerida-ak1o.onrender.com";

    try {
      const response = await axios.post(
        `${API_URL}/api/ml/chat`,
        {
          message: queryText,
          history: messages.map((m) => ({
            sender: m.sender,
            text: m.text,
            street: m.params?.street,
            hour: m.params?.hour,
            day: m.params?.day,
          })),
        },
        {
          timeout: 8000, // Timeout de 8 segundos
        },
      );

      if (response.data && response.data.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: generateMessageId(),
            sender: "bot",
            text: response.data.response,
            prediction: response.data.prediction,
            params: response.data.extracted_params,
            animated: false, // Inicia con efecto typewriter
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: generateMessageId(),
            sender: "bot",
            text: "Lo siento, el modelo de Machine Learning no pudo procesar esta consulta en este momento.",
            animated: false,
          },
        ]);
      }
    } catch (err) {
      console.warn("Error de conexión con el microservicio:", err);

      const errorMessage =
        err.code === "ECONNABORTED"
          ? "⚠️ El servidor en la nube está tardando en responder (estaba inactivo). Por favor, intenta enviar tu pregunta de nuevo en unos segundos."
          : "⚠️ No se pudo establecer comunicación con el microservicio de FastAPI. Verifica que esté en línea o revisa tu conexión a internet.";

      setMessages((prev) => [
        ...prev,
        {
          id: generateMessageId(),
          sender: "bot",
          text: errorMessage,
          animated: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // PANTALLA OFFLINE: Si el usuario no tiene conexión a internet
  if (!isOnline) {
    return (
      <div
        className={`relative w-full h-[100dvh] flex flex-col items-center justify-center bg-white dark:bg-gray-950 px-6 text-center select-none transition-all duration-300 pb-20 md:pb-0 ${
          isExpanded ? "md:pl-[392px]" : "md:pl-24 lg:pl-32"
        }`}
      >
        <div className="max-w-md w-full flex flex-col items-center animate-chat-bubble">
          {/* Imagen ilustrativa del bot en assets (chatia.png) */}
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-emerald-500/15 dark:bg-emerald-400/10 blur-2xl pointer-events-none" />
            <img
              src={chatiaImg}
              alt="Asistente IA Offline"
              className="relative w-44 sm:w-52 h-auto drop-shadow-xl"
            />
          </div>

          {/* Badge de estado sin conexión */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-semibold mb-3 shadow-xs">
            <WifiOff size={14} />
            <span>Sin conexión a internet</span>
          </div>

          {/* Título */}
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Agente IA no disponible
          </h2>

          {/* Texto requerido */}
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-3 leading-relaxed max-w-sm">
            Conéctate a internet para acceder a la función del agente IA y consultar predicciones de tráfico en tiempo real.
          </p>

          {/* Botón para verificar conexión */}
          <button
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.onLine) {
                setIsOnline(true);
              }
            }}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer active:scale-95"
          >
            <RefreshCw size={14} />
            <span>Verificar conexión</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-[100dvh] flex flex-col bg-white dark:bg-gray-950 overflow-hidden transition-all duration-300 ${
        isExpanded ? "md:pl-[392px]" : "md:pl-24 lg:pl-32"
      }`}
    >
      {/* 1. ÁREA DE MENSAJES CON SCROLL INVISIBLE (Estilo Gemini) */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto no-scrollbar px-4 sm:px-6 pt-4 pb-6 max-w-4xl mx-auto w-full flex flex-col"
      >
        {/* PANTALLA INICIAL: Cuando recién entras y aún no has hecho consultas */}
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center my-auto text-center px-4 py-8 animate-chat-bubble">
            {/* Esfera / Bola 3D de Asistente IA (Estilo Gemini / Siri) */}
            <div className="relative mb-6 flex items-center justify-center">
              {/* Halo difuminado exterior suave */}
              <div className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-emerald-500/20 dark:bg-emerald-400/25 blur-2xl pointer-events-none" />

              {/* Esfera con gradientes 3D, oclusión e iluminación orgánica */}
              <div
                className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full ai-orb-glow overflow-hidden select-none cursor-default shadow-xl transition-transform duration-500 hover:scale-105"
                style={{
                  background:
                    "radial-gradient(circle at 32% 28%, #6ee7b7 0%, #10b981 35%, #047857 70%, #022c22 100%)",
                }}
              >
                {/* Reflejo especular superior para volumen 3D */}
                <div
                  className="absolute inset-0 rounded-full opacity-80 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle at 35% 25%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.2) 28%, transparent 55%)",
                  }}
                />
                {/* Reflejo secundario inferior tipo esmeralda */}
                <div
                  className="absolute inset-0 rounded-full opacity-60 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle at 65% 80%, rgba(52,211,153,0.5) 0%, transparent 45%)",
                  }}
                />
                {/* Sombra de oclusión interna */}
                <div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    boxShadow:
                      "inset -5px -7px 15px rgba(2, 44, 34, 0.75), inset 3px 5px 10px rgba(255, 255, 255, 0.4)",
                  }}
                />
              </div>
            </div>

            {/* Nombre del Asistente IA */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Asistente MovilMérida
            </h1>

            {/* Subtítulo requerido */}
            <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 mt-2 font-normal">
              ¿Cómo puedo ayudarte?
            </p>

            {/* Tarjetas de sugerencias rápidas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl mt-8">
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(sug)}
                  className="p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 hover:border-emerald-300 dark:hover:border-emerald-700/60 text-left text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 transition-all flex items-center justify-between group cursor-pointer shadow-xs hover:shadow-md"
                >
                  <span>{sug}</span>
                  <ArrowRight
                    size={15}
                    className="opacity-0 group-hover:opacity-100 text-emerald-600 dark:text-emerald-400 transition-opacity flex-shrink-0 ml-2"
                  />
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* HISTORIAL DE CONVERSACIÓN */
          <div className="flex-1 flex flex-col justify-start">
            <div className="space-y-5 py-2">
              {messages.map((msg, index) => (
                <div
                  key={msg.id || index}
                  className={`flex items-start gap-3.5 animate-chat-bubble ${
                    msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      msg.sender === "user"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                        : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                    }`}
                  >
                    {msg.sender === "user" ? (
                      <User size={15} />
                    ) : (
                      <Bot size={15} />
                    )}
                  </div>

                  {/* Burbuja de mensaje con animación suave */}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                      msg.sender === "user"
                        ? "bg-emerald-600 text-white rounded-tr-none"
                        : "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-200/60 dark:border-gray-800"
                    }`}
                  >
                    {msg.sender === "bot" && !msg.animated ? (
                      <TypewriterText
                        text={msg.text}
                        onScroll={() => {
                          if (!showScrollBottom) scrollToBottom("auto");
                        }}
                        onComplete={() => {
                          setMessages((prev) =>
                            prev.map((m) =>
                              m.id === msg.id ? { ...m, animated: true } : m,
                            ),
                          );
                          if (!showScrollBottom) scrollToBottom("auto");
                        }}
                      />
                    ) : (
                      <span className="whitespace-pre-line leading-relaxed">
                        {msg.text}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Burbuja con 3 puntos animados (Typing indicator estilo Gemini) mientras responde la IA */}
              {loading && (
                <div className="flex items-start gap-3.5 animate-chat-bubble">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center flex-shrink-0 shadow-xs">
                    <Bot size={15} />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-900 px-4 py-3.5 rounded-2xl rounded-tl-none border border-gray-200/60 dark:border-gray-800 shadow-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-bounce [animation-delay:-0.32s]" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-bounce [animation-delay:-0.16s]" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* 2. BOTÓN FLOTANTE "IR AL FINAL" (Flecha hacia abajo estilo Gemini) */}
      {showScrollBottom && (
        <button
          onClick={() => {
            scrollToBottom("smooth");
            setShowScrollBottom(false);
          }}
          className="absolute bottom-28 md:bottom-24 left-1/2 -translate-x-1/2 z-30 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:scale-110 active:scale-95 transition-all cursor-pointer animate-chat-bubble"
          title="Ir al mensaje más reciente"
        >
          <ArrowDown size={18} />
        </button>
      )}

      {/* 3. BARRA DE ENTRADA FIJA INFERIOR (Estilo Gemini) */}
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pb-20 md:pb-4 pt-3 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-gray-950 dark:via-gray-950/95 dark:to-transparent z-20 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-2xl shadow-md focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition-all p-2"
        >
          {/* Botón de Refresh / Nuevo Chat a la izquierda */}
          <button
            type="button"
            onClick={() => {
              setMessages([]);
              setInput("");
              setLoading(false);
            }}
            className="p-2 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-200/60 dark:hover:bg-gray-800 rounded-xl transition-all cursor-pointer flex-shrink-0 mr-1"
            title="Iniciar nuevo chat"
          >
            <RotateCcw size={17} />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu consulta sobre el tráfico (ej. Av. Itzáes a las 11 am)..."
            className="w-full bg-transparent border-none focus:outline-none text-xs sm:text-sm px-2 py-2 text-gray-900 dark:text-white placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-shrink-0 ml-1.5"
          >
            <Send size={16} />
          </button>
        </form>
        <div className="text-center mt-2">
          <span className="text-[10px] text-gray-400 dark:text-gray-600 font-medium">
            MovilMérida AI • Los datos no se almacenan y las predicciones pueden
            fallar.
          </span>
        </div>
      </div>
    </div>
  );
};

export default PredictionView;
