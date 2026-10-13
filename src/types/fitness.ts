export type MuscleGroup = 'Pecho' | 'Espalda' | 'Piernas' | 'Hombros' | 'Brazos' | 'Core';

export interface ExerciseDefinition {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles: string[];
  equipment: 'Barra' | 'Mancuernas' | 'Polea' | 'Máquina' | 'Corporal';
  movementType: 'Compuesto' | 'Aislamiento';
  description: string;
  technique: string[];
  scientificTips: string;
  targetRIR: string;
}

export interface SetEntry {
  id: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe: number; // 1 to 10
  completed: boolean;
  notes?: string;
}

export interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  sets: SetEntry[];
}

export interface WorkoutSession {
  id?: string;
  userId: string;
  title: string;
  routineType: 'Push' | 'Pull' | 'Pierna' | 'Torso' | 'Full Body' | 'Sesión Libre';
  date: string; // ISO string
  durationMinutes: number;
  totalVolumeKg: number;
  notes: string;
  exercises: WorkoutExercise[];
  createdAt?: string;
  syncedToSheets?: boolean;
  spreadsheetUrl?: string;
}

export interface BodyMetric {
  id?: string;
  userId: string;
  date: string;
  weightKg: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  bicepCm?: number;
  thighCm?: number;
  notes?: string;
  photoUrl?: string;
  createdAt?: string;
}

export interface ScheduledWorkout {
  id?: string;
  userId: string;
  title: string;
  routineType: string;
  scheduledAt: string; // ISO string
  calendarEventId?: string;
  status: 'pendiente' | 'completada' | 'cancelada';
  createdAt?: string;
}

export interface CoachChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  actionLogged?: {
    exercise: string;
    sets: number;
    reps: number;
    weight: number;
    rpe?: number;
  };
  searchQueries?: string[];
  searchSources?: { title: string; url: string }[];
}

export type Gender = 'hombre' | 'mujer';
export type ExperienceLevel = 'principiante' | 'intermedio' | 'avanzado';
export type ActivityLevel = 'sedentario' | 'ligero' | 'moderado' | 'activo' | 'muy_activo';
export type FitnessGoal = 'volumen' | 'definicion' | 'recomposicion';

export interface AthleteProfile {
  id?: string;
  userId: string;
  age: number;
  gender: Gender;
  weightKg: number;
  heightCm: number;
  bodyFatPercent?: number;
  experienceLevel: ExperienceLevel;
  activityLevel: ActivityLevel;
  primaryGoal: FitnessGoal;
  bmr?: number; // Mifflin-St Jeor (kcal/día)
  tdee?: number; // Mantenimiento calórico (kcal/día)
  proteinGrams?: number; // Requerimiento proteico diario
  targetCalories?: number; // Calorías según objetivo
  updatedAt?: string;
}

export interface CustomRoutine {
  id?: string;
  userId: string;
  name: string;
  goal: FitnessGoal;
  splitType: string;
  daysPerWeek: number;
  scientificRationale: string;
  exercises: WorkoutExercise[];
  createdAt: string;
}
