import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Sparkles,
  Brain,
  Search,
  CheckCircle2,
  Dumbbell,
  Calculator,
  Timer,
  Info,
  ExternalLink,
} from 'lucide-react';
import { askGeminiCoach, speakCoachMessage } from '../services/geminiCoach';
import { CoachChatMessage } from '../types/fitness';

interface GeminiCoachVoiceProps {
  onLogWorkout?: (exercise: string, sets: number, reps: number, weight: number, rpe?: number) => void;
  activeRoutineName?: string;
  onOpenTimer?: (seconds: number) => void;
}

export const GeminiCoachVoice: React.FC<GeminiCoachVoiceProps> = ({
  onLogWorkout,
  activeRoutineName,
  onOpenTimer,
}) => {
  const [messages, setMessages] = useState<CoachChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: '¡Hola, atleta! Soy Gemini Coach, tu entrenador personal con Google Search Grounding y fisiología deportiva de élite. Puedes hablarme o escribir para registrar tus series con la voz (ej: "Apunta press de banca 4 series de 10 reps con 80kg RPE 8"), calcular tu 1RM o consultar las últimas pautas científicas de hipertrofia y sobrecarga progresiva. ¿Qué vamos a entrenar hoy?',
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [autoSpeechResponse, setAutoSpeechResponse] = useState(true);
  const [thinkingMode, setThinkingMode] = useState(false);
  const [searchGrounding, setSearchGrounding] = useState(true);
  const [lastLoggedBadge, setLastLoggedBadge] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check Web Speech API support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((res: any) => res[0].transcript)
          .join('');
        setInputText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const toggleListening = () => {
    if (!speechSupported) {
      setMessages((prev) => [
        ...prev,
        {
          id: `warn-${Date.now()}`,
          role: 'assistant',
          text: 'ℹ️ Tu navegador no soporta reconocimiento de voz nativo Web Speech. Puedes escribir tus comandos y series directamente en el campo de texto.',
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInputText('');
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userMessage: CoachChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const response = await askGeminiCoach({
        prompt: text.trim(),
        conversationHistory: historyPayload,
        routineContext: activeRoutineName ? { name: activeRoutineName, completedCount: 0 } : null,
        thinkingMode,
        searchGrounding,
      });

      let loggedActionInfo: any = undefined;

      // Handle function calling
      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const call of response.functionCalls) {
          if (call.name === 'logWorkout' && call.args) {
            const { exercise, sets, reps, weight, rpe } = call.args;
            if (onLogWorkout) {
              onLogWorkout(exercise, Number(sets), Number(reps), Number(weight), rpe ? Number(rpe) : undefined);
            }
            loggedActionInfo = { exercise, sets, reps, weight, rpe };
            setLastLoggedBadge(`✅ Registrado: ${exercise} (${sets}x${reps} @ ${weight}kg)`);
            setTimeout(() => setLastLoggedBadge(null), 8000);
          } else if (call.name === 'recommendRest' && call.args) {
            const { exerciseType, intensityRPE } = call.args;
            const suggestedSecs = exerciseType?.toLowerCase().includes('compuesto') ? 180 : 90;
            if (onOpenTimer) onOpenTimer(suggestedSecs);
          }
        }
      }

      const replyText =
        response.text ||
        (loggedActionInfo
          ? `¡Anotado! He registrado ${loggedActionInfo.exercise}: ${loggedActionInfo.sets} series de ${loggedActionInfo.reps} repeticiones con ${loggedActionInfo.weight} kilos${
              loggedActionInfo.rpe ? ` a RPE ${loggedActionInfo.rpe}` : ''
            }. Excelente esfuerzo. ¡Descansa bien antes de la siguiente serie!`
          : 'Entendido. He procesado tu solicitud.');

      const botMessage: CoachChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: replyText,
        timestamp: Date.now(),
        actionLogged: loggedActionInfo,
        searchQueries: response.searchQueries,
        searchSources: response.searchSources,
      };

      setMessages((prev) => [...prev, botMessage]);

      if (autoSpeechResponse && replyText) {
        setIsSpeaking(true);
        speakCoachMessage(replyText).finally(() => setIsSpeaking(false));
      }
    } catch (error: any) {
      console.error('Error enviando mensaje:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          text: `⚠️ No pude procesar tu solicitud: ${error?.message || 'Error de conexión'}. Verifica tu conexión a internet o intenta nuevamente.`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'Apunta press de banca 4 series de 10 reps con 80kg RPE 8',
    'Apunta sentadilla 3 series de 8 reps con 100kg RPE 9',
    '¿Cuánto tiempo debo descansar tras sentadillas pesadas?',
    'Calcula mi 1RM de press militar si levanto 60kg para 6 reps',
    '¿Cómo aplico sobrecarga progresiva esta semana en hipertrofia?',
  ];

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 rounded-3xl border border-zinc-800/80 overflow-hidden shadow-2xl">
      {/* Top Banner / Coach Status */}
      <div className="bg-zinc-900/90 border-b border-zinc-800 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            {isSpeaking && (
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Gemini Coach IA</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Fisiólogo Deportivo
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              {isListening
                ? '🎙️ Escuchando tu voz...'
                : isSpeaking
                ? '🔊 Hablando con síntesis de voz...'
                : 'Registra entrenamientos por voz o consulta ciencia deportiva'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Thinking Mode toggle */}
          <button
            onClick={() => setThinkingMode(!thinkingMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
              thinkingMode
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/20'
                : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50 hover:bg-zinc-800'
            }`}
            title="Razonamiento avanzado para periodización con gemini-3.1-pro-preview"
          >
            <Brain className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pensamiento Alto</span>
          </button>

          {/* Search Grounding toggle */}
          <button
            onClick={() => setSearchGrounding(!searchGrounding)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
              searchGrounding
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50 hover:bg-zinc-800'
            }`}
            title="Búsqueda científica actualizada en Google Search"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Búsqueda Web</span>
          </button>

          {/* Audio toggle */}
          <button
            onClick={() => setAutoSpeechResponse(!autoSpeechResponse)}
            className={`p-2 rounded-xl text-xs font-semibold transition border ${
              autoSpeechResponse
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-zinc-800/60 text-zinc-500 border-zinc-700/50'
            }`}
            title={autoSpeechResponse ? 'Voz activa' : 'Voz silenciada'}
          >
            {autoSpeechResponse ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Floating Alert for Logged Workout */}
      {lastLoggedBadge && (
        <div className="bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 animate-pulse">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{lastLoggedBadge}</span>
        </div>
      )}

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-none'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>

              {/* Function calling result card */}
              {msg.actionLogged && (
                <div className="mt-3 pt-2.5 border-t border-zinc-700/60 bg-zinc-950/40 rounded-xl p-2.5 flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Dumbbell className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-emerald-300">
                      ¡Serie añadida a la sesión!
                    </div>
                    <div className="text-zinc-300">
                      {msg.actionLogged.exercise}: {msg.actionLogged.sets} series x {msg.actionLogged.reps} reps @ {msg.actionLogged.weight} kg
                      {msg.actionLogged.rpe ? ` (RPE ${msg.actionLogged.rpe})` : ''}
                    </div>
                  </div>
                </div>
              )}

              {/* Google Search Grounding verified sources */}
              {msg.searchSources && msg.searchSources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-zinc-800 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-blue-400 font-bold text-[11px]">
                    <Search className="w-3.5 h-3.5" />
                    <span>Fuentes de Google Search (Evidencia Científica):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.searchSources.map((source, sIdx) => (
                      <a
                        key={sIdx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-950/40 text-blue-300 border border-blue-500/30 hover:bg-blue-900/50 hover:text-white transition text-[11px] truncate max-w-[280px]"
                      >
                        <span className="truncate">{source.title}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 px-1">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-zinc-400 text-xs py-2 px-3 bg-zinc-900/60 rounded-xl w-fit border border-zinc-800">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Gemini Coach está pensando y procesando tu voz...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Wave Animation when microphone active */}
      {isListening && (
        <div className="bg-emerald-950/40 border-t border-emerald-500/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-4 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-6 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-8 bg-emerald-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.2s]"></span>
              <span className="w-1.5 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.35s]"></span>
            </div>
            <span className="text-xs text-emerald-300 font-medium">
              Habla ahora (ej: "Apunta press de banca 4x10 con 80 kilos")
            </span>
          </div>
          <button
            onClick={() => handleSendMessage()}
            className="text-xs px-3 py-1 bg-emerald-500 text-zinc-950 font-bold rounded-lg hover:bg-emerald-400"
          >
            Enviar voz
          </button>
        </div>
      )}

      {/* Quick Prompts Bar */}
      <div className="px-4 py-2 bg-zinc-900/40 border-t border-zinc-800/80 overflow-x-auto flex gap-2 no-scrollbar">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p)}
            className="whitespace-nowrap px-3 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/50 text-xs text-zinc-300 transition flex-shrink-0"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Bottom Input & Voice Trigger */}
      <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2">
        <button
          onClick={toggleListening}
          className={`p-3.5 rounded-2xl transition-all duration-300 shadow-lg flex-shrink-0 ${
            isListening
              ? 'bg-red-500 text-white animate-pulse shadow-red-500/30'
              : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40 shadow-emerald-500/10'
          }`}
          title={isListening ? 'Detener micrófono' : 'Hablar con Gemini Coach por voz'}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage();
          }}
          placeholder={isListening ? 'Escuchando...' : 'Escribe o habla a tu Coach...'}
          className="flex-1 bg-zinc-800/90 border border-zinc-700/80 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
        />

        <button
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || isLoading}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-bold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-lg shadow-emerald-500/20 flex-shrink-0"
          title="Enviar"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
