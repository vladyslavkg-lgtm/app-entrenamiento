export interface CoachResponse {
  text: string;
  functionCalls?: {
    name: string;
    args: any;
  }[];
  modelUsed?: string;
  searchQueries?: string[];
  searchSources?: { title: string; url: string }[];
  error?: string;
}

export async function askGeminiCoach(params: {
  prompt: string;
  conversationHistory?: { role: 'user' | 'assistant'; text: string }[];
  routineContext?: { name: string; completedCount: number } | null;
  thinkingMode?: boolean;
  searchGrounding?: boolean;
}): Promise<CoachResponse> {
  const res = await fetch('/api/coach/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al comunicarse con Gemini Coach');
  }

  return res.json();
}

export interface ExerciseSubstituteOption {
  name: string;
  muscleGroup: string;
  equipment: string;
  rationale: string;
  advantage: string;
  targetSets: number;
  targetReps: number;
  targetRIR: string;
}

export async function substituteExercise(params: {
  exerciseName: string;
  muscleGroup?: string;
  reason?: string;
  profile?: any;
}): Promise<{ originalExercise: string; substitutes: ExerciseSubstituteOption[] }> {
  const res = await fetch('/api/coach/substitute-exercise', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al buscar sustitutos biomecánicos');
  }

  return res.json();
}

export interface AthleticAnalysisReport {
  summary: string;
  fatigaStatus: string;
  volumeAssessment: string;
  progressiveOverloadTip: string;
  recoveryAdvice: string;
  nutritionAdjustment: string;
}

export async function analyzeAthleticProgress(params: {
  workouts: any[];
  metrics: any[];
  profile?: any;
}): Promise<AthleticAnalysisReport> {
  const res = await fetch('/api/coach/analyze-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al generar análisis de progreso');
  }

  return res.json();
}

/**
 * Synthesizes coach audio using Gemini TTS and falls back to Web Speech API
 */
export async function speakCoachMessage(text: string): Promise<void> {
  try {
    const res = await fetch('/api/coach/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: 'Fenrir' }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        await audio.play();
        return;
      }
    }
  } catch (err) {
    console.warn('Gemini TTS failed, falling back to Web Speech API:', err);
  }

  // Fallback to Web Speech API
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_#`~]/g, '');
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'es-ES';
    utterance.rate = 1.05;
    utterance.pitch = 0.95;
    window.speechSynthesis.speak(utterance);
  }
}

/**
 * Generates an energetic audio beep for timer completion using Web Audio API
 */
export function playTimerBeep(type: 'warning' | 'finish' = 'finish') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'warning') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else {
      // 3 upbeat success beeps
      [0, 0.18, 0.36].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(idx === 2 ? 880 : 700, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.14);
      });
    }
  } catch (e) {
    console.warn('Audio context playback failed:', e);
  }
}
