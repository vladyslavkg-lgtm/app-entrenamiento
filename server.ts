import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const logWorkoutFunction = {
  name: 'logWorkout',
  description: 'Registra un ejercicio realizado con sus series, repeticiones, peso y RPE.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      exercise: {
        type: Type.STRING,
        description: 'Nombre del ejercicio en español (ej. Press de Banca, Sentadilla, Dominadas, Peso Muerto, Curl de Bíceps)',
      },
      sets: {
        type: Type.INTEGER,
        description: 'Número de series completadas (ej. 3, 4)',
      },
      reps: {
        type: Type.INTEGER,
        description: 'Número de repeticiones por serie o promedio (ej. 8, 10, 12)',
      },
      weight: {
        type: Type.NUMBER,
        description: 'Peso utilizado en kg (ej. 80, 100, 22.5)',
      },
      rpe: {
        type: Type.NUMBER,
        description: 'Escala de esfuerzo percibido RPE de 1 a 10 (ej. 8, 8.5, 9)',
      },
      notes: {
        type: Type.STRING,
        description: 'Observaciones técnicas o sensaciones (opcional)',
      },
    },
    required: ['exercise', 'sets', 'reps', 'weight'],
  },
};

const calculate1RMFunction = {
  name: 'calculate1RM',
  description: 'Calcula el 1RM estimado (repetición máxima) usando la fórmula científica de Epley/Brzycki.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      exercise: {
        type: Type.STRING,
        description: 'Nombre del ejercicio',
      },
      weight: {
        type: Type.NUMBER,
        description: 'Peso levantado en kg',
      },
      reps: {
        type: Type.INTEGER,
        description: 'Repeticiones realizadas con ese peso',
      },
    },
    required: ['exercise', 'weight', 'reps'],
  },
};

const recommendRestFunction = {
  name: 'recommendRest',
  description: 'Recomienda tiempo de descanso óptimo en segundos basado en fisiología muscular y tipo de movimiento.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      exerciseType: {
        type: Type.STRING,
        description: 'compuesto (ej. sentadilla, banca) o aislamiento (ej. curl, elevaciones)',
      },
      intensityRPE: {
        type: Type.NUMBER,
        description: 'RPE del esfuerzo realizado (1 a 10)',
      },
    },
    required: ['exerciseType'],
  },
};

// API Endpoint: Chat & Voice Command Processing
app.post('/api/coach/chat', async (req, res) => {
  try {
    const {
      prompt,
      conversationHistory = [],
      routineContext = null,
      thinkingMode = false,
      searchGrounding = false,
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'El mensaje es requerido' });
    }

    const systemInstruction = `Eres Gemini Coach, un entrenador personal y fisiólogo del deporte de élite basado estrictamente en la evidencia científica sobre hipertrofia y fuerza muscular (gestión del RIR/RPE, sobrecarga progresiva, fatiga neuromuscular y volumen semanal efectivo por grupo muscular).
Tus respuestas deben ser motivadoras, directas, rigurosas y en ESPAÑOL.
${routineContext ? `Contexto actual del usuario: Rutina "${routineContext.name || 'Personalizada'}", Ejercicios ya completados: ${routineContext.completedCount || 0}.` : ''}

REGLA CLAVE DE REGISTRO POR VOZ:
Cuando el usuario mencione que hizo un ejercicio, series, reps, peso o sensaciones (ej: "Apunta press de banca 4 series de 10 reps con 80kg RPE 8" o "acabo de hacer sentadilla 3x8 con 100 kilos a rpe 9"), invoca OBLIGATORIAMENTE la herramienta "logWorkout".
Si el usuario pregunta por 1RM o descansos, puedes invocar también "calculate1RM" o "recommendRest".
Acompaña tu llamada con un breve mensaje motivador o feedback biomecánico útil.`;

    const modelName = searchGrounding
      ? 'gemini-2.5-flash'
      : thinkingMode
      ? 'gemini-3.1-pro-preview'
      : 'gemini-3.8-flash';

    const tools: any[] = [
      {
        functionDeclarations: [
          logWorkoutFunction,
          calculate1RMFunction,
          recommendRestFunction,
        ],
      },
    ];

    if (searchGrounding) {
      tools.push({ googleSearch: {} });
    }

    const contents: any[] = [];

    // Include last 8 conversation turns for context
    if (Array.isArray(conversationHistory)) {
      conversationHistory.slice(-8).forEach((item: any) => {
        if (item.role && item.text) {
          contents.push({
            role: item.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: item.text }],
          });
        }
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    const config: any = {
      systemInstruction,
      temperature: 0.7,
      tools,
    };

    if (searchGrounding) {
      config.toolConfig = { includeServerSideToolInvocations: true };
    }

    if (thinkingMode) {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    }

    let response;
    let finalModel = modelName;
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents,
        config,
      });
    } catch (primaryErr: any) {
      console.warn(`Primary model ${modelName} error, trying fallback gemini-3.8-flash:`, primaryErr?.message);
      finalModel = 'gemini-3.8-flash';
      response = await ai.models.generateContent({
        model: finalModel,
        contents,
        config,
      });
    }

    const text = response.text || '';
    const functionCalls = response.functionCalls || [];

    // Extract Google Search grounding metadata if present
    const groundingMeta = response.candidates?.[0]?.groundingMetadata;
    const searchQueries = groundingMeta?.webSearchQueries || [];
    const searchSources =
      groundingMeta?.groundingChunks
        ?.map((chunk: any) => ({
          title: chunk.web?.title || 'Fuente Científica',
          url: chunk.web?.uri,
        }))
        ?.filter((s: any) => Boolean(s.url)) || [];

    return res.json({
      text,
      functionCalls,
      modelUsed: finalModel,
      searchQueries,
      searchSources,
    });
  } catch (error: any) {
    console.error('Error en /api/coach/chat:', error);
    return res.status(500).json({
      error: error?.message || 'Error al comunicarse con Gemini Coach',
    });
  }
});

// API Endpoint: Coach Voice Synthesis (Gemini TTS)
app.post('/api/coach/tts', async (req, res) => {
  try {
    const { text, voice = 'Fenrir' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Texto es requerido' });
    }

    // Clean text: strip markdown symbols and emojis for clean speech
    const cleanText = text
      .replace(/[*_#`~]/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .slice(0, 400);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style: 'Entrenador de fuerza motivador, profesional y enérgico en español',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || 'Fenrir' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return res.json({
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
      });
    }

    return res.status(500).json({ error: 'No se generó audio' });
  } catch (error: any) {
    console.error('TTS error:', error);
    return res.status(200).json({ audioBase64: null, error: error?.message });
  }
});

// API Endpoint: Science-backed Routine Generator
app.post('/api/coach/generate-routine', async (req, res) => {
  try {
    const {
      profile,
      goal = 'volumen',
      daysPerWeek = 4,
      splitPreference = 'auto',
      focusMuscles = [],
      searchGrounding = false,
    } = req.body;

    const age = profile?.age || 26;
    const gender = profile?.gender || 'hombre';
    const weight = profile?.weightKg || 75;
    const experience = profile?.experienceLevel || 'intermedio';

    const systemInstruction = `Eres un fisiólogo del ejercicio y metodólogo de entrenamiento de fuerza basado en la evidencia científica (Schoenfeld, Helms, Nuckols).
Tu misión es diseñar una sesión de entrenamiento ultra optimizada considerando el perfil del atleta:
- Edad: ${age} años
- Sexo: ${gender}
- Peso corporal: ${weight} kg
- Nivel de experiencia: ${experience}
- Objetivo primario: ${goal} (volumen, definición o recomposición)
- Frecuencia disponible: ${daysPerWeek} días por semana
- Preferencia de división: ${splitPreference}
${focusMuscles.length > 0 ? `- Énfasis solicitado: ${focusMuscles.join(', ')}` : ''}

REGLAS CIENTÍFICAS OBLIGATORIAS:
1. Volumen semanal por grupo muscular: Mantener entre 10 y 20 series semanales efectivas.
2. Gestión de fatiga sistémica y RPE/RIR: Series compuestas a RPE 7.5-8.5 (RIR 1.5-2.5); ejercicios de aislamiento a RPE 8.5-9.5 (RIR 0.5-1.5).
3. Selección de ejercicios: Priorizar patrones biomecánicos con alta tensión mecánica en estiramiento y curvas de fuerza estables.
4. Responder ÚNICAMENTE un JSON válido con este formato:
{
  "name": "Nombre descriptivo de la rutina (ej. Push Hipertrofia Científica - Énfasis Pectoral)",
  "goal": "${goal}",
  "splitType": "Push, Pull, Pierna, Torso o Full Body",
  "daysPerWeek": ${daysPerWeek},
  "scientificRationale": "Explicación concisa (3-4 frases) de la justificación fisiológica: volumen por grupo, RIR y adaptación neuromotora.",
  "exercises": [
    {
      "exerciseId": "identificador-slug",
      "exerciseName": "Nombre exacto del ejercicio en español",
      "muscleGroup": "Pecho | Espalda | Piernas | Hombros | Brazos | Core",
      "defaultSets": 3,
      "defaultReps": 8,
      "defaultWeight": 60,
      "targetRIR": "RIR 2 (RPE 8)",
      "notes": "Consejo técnico biomecánico"
    }
  ]
}`;

    const prompt = `Genera una sesión de entrenamiento personalizada y biomecánicamente óptima para el atleta según su perfil y objetivo de ${goal}.`;

    const modelName = searchGrounding ? 'gemini-2.5-flash' : 'gemini-3.8-flash';
    const config: any = {
      systemInstruction,
      responseMimeType: 'application/json',
      temperature: 0.5,
    };

    if (searchGrounding) {
      config.tools = [{ googleSearch: {} }];
    }

    let response;
    let finalModel = modelName;
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config,
      });
    } catch (err: any) {
      console.warn(`Fallback para generate-routine desde ${modelName}:`, err?.message);
      finalModel = 'gemini-3.8-flash';
      response = await ai.models.generateContent({
        model: finalModel,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.5,
        },
      });
    }

    const rawJson = response.text?.trim() || '{}';
    let routineData: any;
    try {
      routineData = JSON.parse(rawJson);
    } catch (parseErr) {
      const cleanJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
      routineData = JSON.parse(cleanJson);
    }

    return res.json({ routine: routineData, modelUsed: finalModel });
  } catch (error: any) {
    console.error('Error generando rutina con IA:', error);
    return res.status(500).json({
      error: error?.message || 'Error al generar la rutina personalizada',
    });
  }
});

// API Endpoint: Intelligent Exercise Substitute (Evidence-based alternatives)
app.post('/api/coach/substitute-exercise', async (req, res) => {
  try {
    const { exerciseName, muscleGroup, reason = 'variación biomecánica', profile } = req.body;

    if (!exerciseName) {
      return res.status(400).json({ error: 'exerciseName es requerido' });
    }

    const systemInstruction = `Eres un biomecánico y fisiólogo del ejercicio. Tu tarea es proporcionar 3 ejercicios sustitutos biomecánicamente equivalentes para "${exerciseName}" (${muscleGroup || 'Grupo Muscular'}).
Motivo del usuario: "${reason}".
Debes responder ÚNICAMENTE un JSON con este formato:
{
  "originalExercise": "${exerciseName}",
  "substitutes": [
    {
      "name": "Nombre en español",
      "muscleGroup": "${muscleGroup || 'Pecho'}",
      "equipment": "Mancuernas | Poleas | Máquina | Barra | Peso Corporal",
      "rationale": "Por qué es un excelente sustituto y curva de resistencia",
      "advantage": "Ventaja clave (ej. menor estrés lumbar, pico de tensión en acortamiento)",
      "targetSets": 3,
      "targetReps": 10,
      "targetRIR": "RIR 2"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: `Recomienda 3 sustitutos biomecánicos para ${exerciseName}` }] }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.4,
        tools: [{ googleSearch: {} }],
      },
    });

    const rawJson = response.text?.trim() || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      const cleanJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error('Error en /api/coach/substitute-exercise:', error);
    return res.status(500).json({
      error: error?.message || 'Error al buscar sustitutos biomecánicos',
    });
  }
});

// API Endpoint: Athletic Progress & Recovery AI Analysis
app.post('/api/coach/analyze-progress', async (req, res) => {
  try {
    const { workouts = [], metrics = [], profile } = req.body;

    const totalSessions = workouts.length;
    const totalVolume = workouts.reduce((acc: number, w: any) => acc + (Number(w.totalVolumeKg) || 0), 0);
    const recentSessions = workouts.slice(0, 5).map((w: any) => ({
      title: w.title,
      date: w.date,
      volumeKg: w.totalVolumeKg,
      exercisesCount: w.exercises?.length || 0,
    }));

    const systemInstruction = `Eres un asesor de rendimiento y fisiólogo deportivo. Analiza los datos del atleta:
- Perfil: ${profile?.age || 26} años, ${profile?.gender || 'hombre'}, ${profile?.weightKg || 75} kg, nivel ${profile?.experienceLevel || 'intermedio'}, objetivo ${profile?.primaryGoal || 'volumen'}.
- Total entrenamientos completados: ${totalSessions}
- Volumen total acumulado: ${totalVolume} kg
- Últimas sesiones: ${JSON.stringify(recentSessions)}
- Historial de peso corporal: ${metrics.length} mediciones registradas.

Genera un reporte analítico conciso en formato JSON:
{
  "summary": "Resumen ejecutivo del progreso atlético (2 frases)",
  "fatigaStatus": "Óptima | Moderada | Acumulada (Sugerir descarga)",
  "volumeAssessment": "Evaluación del tonelaje semanal frente al umbral óptimo de 10-20 series",
  "progressiveOverloadTip": "Recomendación concreta de sobrecarga progresiva para la próxima semana (ej. +2.5kg o +1 rep)",
  "recoveryAdvice": "Consejo de sueño, hidratación o descansos entre series",
  "nutritionAdjustment": "Recomendación calórica o proteica según objetivo"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: 'Analiza mi progreso atlético y sobrecarga progresiva.' }] }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.4,
        tools: [{ googleSearch: {} }],
      },
    });

    const rawJson = response.text?.trim() || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      const cleanJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error('Error en /api/coach/analyze-progress:', error);
    return res.status(500).json({
      error: error?.message || 'Error al analizar el progreso del atleta',
    });
  }
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`🚀 AuraFit Server running on port ${port} (mode: ${isDev ? 'development' : 'production'})`);
  });
}

startServer();
