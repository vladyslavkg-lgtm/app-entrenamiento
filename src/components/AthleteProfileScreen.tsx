import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  HeartPulse,
  Flame,
  Dumbbell,
  Scale,
  Sparkles,
  Save,
  CheckCircle2,
  Info,
  Apple,
  Zap,
  TrendingUp,
  History,
} from 'lucide-react';
import { AthleteProfile, Gender, ExperienceLevel, ActivityLevel, FitnessGoal, BodyMetric } from '../types/fitness';
import {
  calculateMifflinStJeor,
  calculateTDEE,
  calculateTargetCalories,
  calculateProteinGrams,
  calculateBMI,
  calculateBodyComposition,
} from '../utils/metabolism';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { AnthropometricChart } from './AnthropometricChart';

interface AthleteProfileScreenProps {
  userId: string;
  metrics: BodyMetric[];
  initialProfile?: AthleteProfile | null;
  onProfileUpdated: (profile: AthleteProfile) => void;
  onNavigateToRoutineCreator?: () => void;
}

export const AthleteProfileScreen: React.FC<AthleteProfileScreenProps> = ({
  userId,
  metrics,
  initialProfile,
  onProfileUpdated,
  onNavigateToRoutineCreator,
}) => {
  const [age, setAge] = useState<number>(initialProfile?.age || 26);
  const [gender, setGender] = useState<Gender>(initialProfile?.gender || 'hombre');
  const [weightKg, setWeightKg] = useState<number>(
    initialProfile?.weightKg || (metrics.length > 0 ? metrics[0].weightKg : 76)
  );
  const [heightCm, setHeightCm] = useState<number>(initialProfile?.heightCm || 178);
  const [bodyFatPercent, setBodyFatPercent] = useState<number | undefined>(
    initialProfile?.bodyFatPercent || 15
  );
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    initialProfile?.experienceLevel || 'intermedio'
  );
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    initialProfile?.activityLevel || 'moderado'
  );
  const [primaryGoal, setPrimaryGoal] = useState<FitnessGoal>(
    initialProfile?.primaryGoal || 'volumen'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profileHistory, setProfileHistory] = useState<any[]>([]);

  // Sync when initialProfile arrives
  useEffect(() => {
    if (initialProfile) {
      if (initialProfile.age) setAge(initialProfile.age);
      if (initialProfile.gender) setGender(initialProfile.gender);
      if (initialProfile.weightKg) setWeightKg(initialProfile.weightKg);
      if (initialProfile.heightCm) setHeightCm(initialProfile.heightCm);
      if (initialProfile.bodyFatPercent !== undefined) setBodyFatPercent(initialProfile.bodyFatPercent);
      if (initialProfile.experienceLevel) setExperienceLevel(initialProfile.experienceLevel);
      if (initialProfile.activityLevel) setActivityLevel(initialProfile.activityLevel);
      if (initialProfile.primaryGoal) setPrimaryGoal(initialProfile.primaryGoal);
    }
  }, [initialProfile]);

  // Load and subscribe to profile modification history
  useEffect(() => {
    const cachedHistory = localStorage.getItem(`aurafit_profile_history_${userId}`);
    if (cachedHistory) {
      try {
        setProfileHistory(JSON.parse(cachedHistory));
      } catch (_) {}
    }

    if (!userId) return;

    try {
      const q = query(
        collection(db, 'users', userId, 'profileHistory'),
        orderBy('timestamp', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const items: any[] = [];
          snapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() });
          });
          setProfileHistory(items);
          localStorage.setItem(`aurafit_profile_history_${userId}`, JSON.stringify(items));
        },
        (error) => {
          // Fallback gracefully without breaking UI
          console.warn('Profile history sync warning:', error);
        }
      );

      return () => unsubscribe();
    } catch (_) {}
  }, [userId]);

  // Real-time Science Calculations
  const bmr = useMemo(() => {
    return calculateMifflinStJeor(weightKg, heightCm, age, gender);
  }, [weightKg, heightCm, age, gender]);

  const tdee = useMemo(() => {
    return calculateTDEE(bmr, activityLevel);
  }, [bmr, activityLevel]);

  const targetCalories = useMemo(() => {
    return calculateTargetCalories(tdee, primaryGoal);
  }, [tdee, primaryGoal]);

  const protein = useMemo(() => {
    return calculateProteinGrams(weightKg, primaryGoal);
  }, [weightKg, primaryGoal]);

  const bmiData = useMemo(() => {
    return calculateBMI(weightKg, heightCm);
  }, [weightKg, heightCm]);

  const bodyComp = useMemo(() => {
    return calculateBodyComposition(weightKg, bodyFatPercent);
  }, [weightKg, bodyFatPercent]);

  // Healthy Fats & Carbs estimation
  const fatGrams = Math.round(weightKg * 0.9);
  const carbGrams = Math.round(
    Math.max(100, (targetCalories - protein.recommendedGrams * 4 - fatGrams * 9) / 4)
  );

  // Save to Firestore and append to history
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (weightKg <= 0 || heightCm <= 0 || age <= 0) {
      setErrorMessage('Por favor ingresa datos biológicos válidos (edad, peso, altura).');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const nowIso = new Date().toISOString();
    const historyId = `rev_${Date.now()}`;

    const profileData: AthleteProfile = {
      userId,
      age: Number(age),
      gender,
      weightKg: Number(weightKg),
      heightCm: Number(heightCm),
      bodyFatPercent: bodyFatPercent ? Number(bodyFatPercent) : undefined,
      experienceLevel,
      activityLevel,
      primaryGoal,
      bmr,
      tdee,
      proteinGrams: protein.recommendedGrams,
      targetCalories,
      updatedAt: nowIso,
    };

    try {
      // 1. Guardar objeto principal en users/{userId}/profile/main
      const mainPath = `users/${userId}/profile/main`;
      await setDoc(doc(db, 'users', userId, 'profile', 'main'), {
        ...profileData,
        serverTimestamp: serverTimestamp(),
      });

      // 2. Garantizar que cada modificación actualice el historial con marca de tiempo
      const historyEntry = {
        userId,
        timestamp: nowIso,
        weightKg: Number(weightKg),
        heightCm: Number(heightCm),
        age: Number(age),
        gender,
        bodyFatPercent: bodyFatPercent ? Number(bodyFatPercent) : undefined,
        experienceLevel,
        activityLevel,
        primaryGoal,
        bmr,
        tdee,
        proteinGrams: protein.recommendedGrams,
        targetCalories,
        serverTimestamp: serverTimestamp(),
      };

      // Guardar en profileHistory y en profile/historyId
      await setDoc(doc(db, 'users', userId, 'profileHistory', historyId), historyEntry);
      await setDoc(doc(db, 'users', userId, 'profile', historyId), historyEntry);

      // Actualizar estado local del historial
      setProfileHistory((prev) => [historyEntry, ...prev.filter((h) => h.id !== historyId)]);

      // 3. Registrar métrica de peso si no existe para la fecha actual
      try {
        const todayStr = nowIso.split('T')[0];
        const metricId = `metric_${todayStr}`;
        await setDoc(doc(db, 'users', userId, 'metrics', metricId), {
          userId,
          date: nowIso,
          weightKg: Number(weightKg),
          notes: `Perfil: ${primaryGoal} (${experienceLevel})`,
          serverTimestamp: serverTimestamp(),
        });
      } catch (_) {}

      // Save locally as cache
      localStorage.setItem(`aurafit_profile_${userId}`, JSON.stringify(profileData));

      onProfileUpdated(profileData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 5000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/profile/main`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-6 sm:p-8 rounded-3xl border border-zinc-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-xl space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
              <HeartPulse className="w-3.5 h-3.5 text-purple-400" />
              Fisiología del Deporte & Metabolismo
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Perfil de Atleta & Métricas Basales
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Configura tus datos biométricos para calcular automáticamente tu Tasa Metabólica Basal (Mifflin-St Jeor), requerimientos proteicos y personalizar la prescripción de entrenamiento con Gemini.
            </p>
          </div>

          {onNavigateToRoutineCreator && (
            <button
              onClick={onNavigateToRoutineCreator}
              className="px-5 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-bold text-xs border border-emerald-500/30 transition flex items-center gap-2 cursor-pointer shadow-md self-start md:self-auto"
            >
              <Sparkles className="w-4 h-4" />
              <span>Diseñar Rutina con Gemini</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Form Left, Real-Time Calculations Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Form (5 cols) */}
        <div className="lg:col-span-5 bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl shadow-xl space-y-5">
          <div className="pb-3 border-b border-zinc-800">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-400" />
              Datos Antropométricos y Biológicos
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Variables utilizadas para las ecuaciones de metabolismo y volumen.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            {/* Sexo */}
            <div>
              <label className="block text-zinc-300 font-semibold mb-1.5">
                Sexo Biológico (Fórmula Mifflin-St Jeor) *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['hombre', 'mujer'] as Gender[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`py-2.5 px-3 rounded-xl font-bold uppercase tracking-wider transition border cursor-pointer ${
                      gender === g
                        ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                        : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60 hover:text-white'
                    }`}
                  >
                    {g === 'hombre' ? '♂ Hombre' : '♀ Mujer'}
                  </button>
                ))}
              </div>
            </div>

            {/* Edad & Altura */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Edad (años) *</label>
                <input
                  type="number"
                  min="12"
                  max="100"
                  required
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Altura (cm) *</label>
                <input
                  type="number"
                  min="100"
                  max="250"
                  required
                  value={heightCm}
                  onChange={(e) => setHeightCm(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Peso & Grasa Corporal */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Peso Corporal (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="300"
                  required
                  value={weightKg}
                  onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">% Grasa Estimado (BIA)</label>
                <input
                  type="number"
                  step="0.5"
                  min="4"
                  max="60"
                  placeholder="Ej: 14.5"
                  value={bodyFatPercent !== undefined ? bodyFatPercent : ''}
                  onChange={(e) => setBodyFatPercent(e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Nivel de Experiencia */}
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Nivel de Experiencia en Fuerza</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 capitalize"
              >
                <option value="principiante">Principiante (&lt;1 año entrenando)</option>
                <option value="intermedio">Intermedio (1 a 3 años de entrenamiento constante)</option>
                <option value="avanzado">Avanzado (&gt;3 años con progresión sistemática)</option>
              </select>
            </div>

            {/* Nivel de Actividad Física */}
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Nivel de Actividad Diaria</label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="sedentario">Sedentario (Trabajo de escritorio, sin entreno)</option>
                <option value="ligero">Ligero (1-3 días de actividad por semana)</option>
                <option value="moderado">Moderado (3-5 días de entrenamiento de fuerza)</option>
                <option value="activo">Activo (6-7 días de entrenamiento intenso)</option>
                <option value="muy_activo">Muy Activo (Doble sesión o trabajo físico + pesas)</option>
              </select>
            </div>

            {/* Objetivo Principal */}
            <div>
              <label className="block text-zinc-300 font-semibold mb-1.5">Objetivo Deportivo Principal</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'volumen', label: 'Volumen', desc: '+350 kcal' },
                  { id: 'definicion', label: 'Definición', desc: '-450 kcal' },
                  { id: 'recomposicion', label: 'Recomp.', desc: 'Normocalórica' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPrimaryGoal(item.id as FitnessGoal)}
                    className={`p-2.5 rounded-xl text-center border transition cursor-pointer ${
                      primaryGoal === item.id
                        ? 'bg-purple-600/25 border-purple-500 text-purple-300 shadow-sm'
                        : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs">{item.label}</div>
                    <div className="text-[10px] text-zinc-400">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {errorMessage}
              </div>
            )}

            {savedSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Perfil guardado exitosamente en Cloud Firestore</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-extrabold text-xs hover:brightness-110 transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <Save className="w-4 h-4 stroke-[3]" />
                  <span>Guardar Perfil en Cloud Firestore</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Science Dashboard & Energy Requirements (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main 3 Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* BMR Card */}
            <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center justify-between">
                <span>TMB (Mifflin)</span>
                <Flame className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="font-mono text-2xl font-extrabold text-white mt-2">
                {bmr.toLocaleString()} <span className="text-xs text-zinc-400 font-normal">kcal</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1 leading-snug">
                Gasto energético en reposo absoluto para funciones vitales.
              </p>
            </div>

            {/* TDEE Card */}
            <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center justify-between">
                <span>Mantenimiento</span>
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="font-mono text-2xl font-extrabold text-cyan-300 mt-2">
                {tdee.toLocaleString()} <span className="text-xs text-zinc-400 font-normal">kcal</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1 leading-snug">
                Calorías de equilibrio diario considerando tu actividad física.
              </p>
            </div>

            {/* Protein Card */}
            <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center justify-between">
                <span>Proteína Óptima</span>
                <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="font-mono text-2xl font-extrabold text-emerald-400 mt-2">
                {protein.recommendedGrams} <span className="text-xs text-zinc-400 font-normal">g/día</span>
              </div>
              <div className="text-[10px] text-emerald-300/90 mt-1 font-semibold">
                {protein.perKg} g/kg/día ({protein.minGrams}-{protein.maxGrams} g)
              </div>
            </div>
          </div>

          {/* Caloric & Macronutrient Prescription Breakdown */}
          <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Apple className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Prescripción Nutricional para {primaryGoal.toUpperCase()}
                </h3>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                Objetivo: {targetCalories.toLocaleString()} kcal/día
              </span>
            </div>

            {/* Macros Bar */}
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
                  <div className="text-[10px] uppercase text-zinc-400 font-semibold">Proteína</div>
                  <div className="font-mono text-base font-bold text-emerald-400 mt-1">
                    {protein.recommendedGrams}g
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    {protein.recommendedGrams * 4} kcal ({Math.round(((protein.recommendedGrams * 4) / targetCalories) * 100)}%)
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
                  <div className="text-[10px] uppercase text-zinc-400 font-semibold">Carbohidratos</div>
                  <div className="font-mono text-base font-bold text-cyan-400 mt-1">
                    {carbGrams}g
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    {carbGrams * 4} kcal ({Math.round(((carbGrams * 4) / targetCalories) * 100)}%)
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
                  <div className="text-[10px] uppercase text-zinc-400 font-semibold">Grasas</div>
                  <div className="font-mono text-base font-bold text-amber-400 mt-1">
                    {fatGrams}g
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    {fatGrams * 9} kcal ({Math.round(((fatGrams * 9) / targetCalories) * 100)}%)
                  </div>
                </div>
              </div>

              {/* Composition and BMI details */}
              <div className="p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Índice de Masa Corporal (IMC):</span>
                  <span className="font-mono font-bold text-white">
                    {bmiData.bmi} kg/m² ({bmiData.category})
                  </span>
                </div>
                {bodyComp && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Masa Magra Estimada:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {bodyComp.leanMassKg} kg
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Masa Grasa Estimada:</span>
                      <span className="font-mono font-bold text-amber-400">
                        {bodyComp.fatMassKg} kg ({bodyFatPercent}%)
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="text-[11px] text-zinc-400 flex items-start gap-1.5 pt-1">
              <Info className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mt-0.5" />
              <span>
                Basado en el meta-análisis de Morton et al. (2018) sobre síntesis proteica miofibrilar y la ecuación de Mifflin-St Jeor (1990) con margen de error &lt;5% en deportistas.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Anthropometric Evolution Chart Section */}
      <AnthropometricChart metrics={metrics} />

      {/* Historial de Modificaciones del Perfil con Marca de Tiempo */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-purple-400" />
            <h3 className="text-base font-bold text-white">
              Historial de Modificaciones del Perfil (Cloud Firestore)
            </h3>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            {profileHistory.length} revisiones registradas
          </span>
        </div>

        {profileHistory.length === 0 ? (
          <p className="text-xs text-zinc-400 py-2">
            No se han registrado modificaciones previas. Al pulsar "Guardar Perfil" se creará la primera marca de tiempo inmutable.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {profileHistory.slice(0, 6).map((rev, idx) => (
              <div
                key={rev.id || idx}
                className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-purple-500/30 transition text-xs space-y-2"
              >
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="font-semibold text-purple-300">
                    {idx === 0 ? '● Revisión Actual' : `Revisión #${profileHistory.length - idx}`}
                  </span>
                  <span className="font-mono text-zinc-400">
                    {rev.timestamp
                      ? new Date(rev.timestamp).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Fecha registrada'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                  <div className="bg-zinc-900/80 p-2 rounded-xl">
                    <span className="text-[10px] text-zinc-400 block font-sans">Peso:</span>
                    <span className="font-bold text-white text-sm">{rev.weightKg} kg</span>
                  </div>
                  <div className="bg-zinc-900/80 p-2 rounded-xl">
                    <span className="text-[10px] text-zinc-400 block font-sans">TMB:</span>
                    <span className="font-bold text-amber-400 text-sm">{rev.bmr} kcal</span>
                  </div>
                  <div className="bg-zinc-900/80 p-2 rounded-xl">
                    <span className="text-[10px] text-zinc-400 block font-sans">Calorías:</span>
                    <span className="font-bold text-cyan-300 text-sm">{rev.targetCalories} kcal</span>
                  </div>
                  <div className="bg-zinc-900/80 p-2 rounded-xl">
                    <span className="text-[10px] text-zinc-400 block font-sans">Proteína:</span>
                    <span className="font-bold text-emerald-400 text-sm">{rev.proteinGrams}g</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 text-zinc-400 border-t border-zinc-800/60">
                  <span className="capitalize">{rev.primaryGoal || 'volumen'}</span>
                  <span className="capitalize text-zinc-400">{rev.experienceLevel || 'intermedio'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
