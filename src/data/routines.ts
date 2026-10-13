import { EXERCISE_DATABASE } from './exercises';
import { WorkoutExercise } from '../types/fitness';

export interface RoutineTemplate {
  id: string;
  name: string;
  type: 'Push' | 'Pull' | 'Pierna' | 'Torso' | 'Full Body';
  description: string;
  focusMuscles: string[];
  estimatedMinutes: number;
  exercises: {
    exerciseId: string;
    defaultSets: number;
    defaultReps: number;
    defaultWeight: number;
  }[];
}

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'template-push',
    name: 'Rutina Push (Empuje Hipertrofia)',
    type: 'Push',
    description: 'Enfocada en pectoral mayor, porción clavicular, deltoides anterior/lateral y tríceps con sobrecarga progresiva.',
    focusMuscles: ['Pecho', 'Hombros', 'Tríceps'],
    estimatedMinutes: 65,
    exercises: [
      { exerciseId: 'press-banca-barra', defaultSets: 4, defaultReps: 8, defaultWeight: 75 },
      { exerciseId: 'press-inclinado-mancuernas', defaultSets: 3, defaultReps: 10, defaultWeight: 26 },
      { exerciseId: 'elevaciones-laterales-polea', defaultSets: 4, defaultReps: 12, defaultWeight: 10 },
      { exerciseId: 'fondos-paralelas-pecho', defaultSets: 3, defaultReps: 10, defaultWeight: 0 },
      { exerciseId: 'extension-triceps-cuerda', defaultSets: 3, defaultReps: 12, defaultWeight: 25 },
    ],
  },
  {
    id: 'template-pull',
    name: 'Rutina Pull (Tirón & Espalda)',
    type: 'Pull',
    description: 'Tracción horizontal y vertical para dorsal ancho, trapecios, romboides, deltoides posterior y bíceps.',
    focusMuscles: ['Espalda', 'Hombros (Post)', 'Bíceps'],
    estimatedMinutes: 65,
    exercises: [
      { exerciseId: 'peso-muerto-convencional', defaultSets: 3, defaultReps: 6, defaultWeight: 110 },
      { exerciseId: 'dominadas-pronadas', defaultSets: 4, defaultReps: 8, defaultWeight: 0 },
      { exerciseId: 'remo-gironda-polea', defaultSets: 3, defaultReps: 10, defaultWeight: 60 },
      { exerciseId: 'pajaros-face-pull', defaultSets: 3, defaultReps: 15, defaultWeight: 20 },
      { exerciseId: 'curl-biceps-barra-z', defaultSets: 3, defaultReps: 10, defaultWeight: 30 },
      { exerciseId: 'curl-martillo-mancuernas', defaultSets: 3, defaultReps: 12, defaultWeight: 14 },
    ],
  },
  {
    id: 'template-legs',
    name: 'Rutina Pierna (Cuádriceps & Cadena Posterior)',
    type: 'Pierna',
    description: 'Desarrollo integral de tren inferior: patrón de rodilla dominante y bisagra de cadera con alta tensión mecánica.',
    focusMuscles: ['Cuádriceps', 'Isquiosurales', 'Glúteos'],
    estimatedMinutes: 70,
    exercises: [
      { exerciseId: 'sentadilla-trasera-barra', defaultSets: 4, defaultReps: 8, defaultWeight: 90 },
      { exerciseId: 'prensa-45-grados', defaultSets: 3, defaultReps: 12, defaultWeight: 160 },
      { exerciseId: 'peso-muerto-rumano', defaultSets: 3, defaultReps: 10, defaultWeight: 80 },
      { exerciseId: 'extension-cuadriceps-maquina', defaultSets: 3, defaultReps: 12, defaultWeight: 50 },
      { exerciseId: 'curl-femoral-tumbado', defaultSets: 3, defaultReps: 12, defaultWeight: 45 },
    ],
  },
  {
    id: 'template-torso',
    name: 'Rutina Torso (Upper Body Total)',
    type: 'Torso',
    description: 'Equilibrio perfecto de empujes y tirones para tren superior en división Torso / Pierna.',
    focusMuscles: ['Pecho', 'Espalda', 'Hombros', 'Brazos'],
    estimatedMinutes: 60,
    exercises: [
      { exerciseId: 'press-banca-barra', defaultSets: 4, defaultReps: 8, defaultWeight: 80 },
      { exerciseId: 'remo-con-barra-pendlay', defaultSets: 4, defaultReps: 8, defaultWeight: 70 },
      { exerciseId: 'press-militar-barra', defaultSets: 3, defaultReps: 8, defaultWeight: 45 },
      { exerciseId: 'jalon-al-pecho-agarre-neutro', defaultSets: 3, defaultReps: 10, defaultWeight: 65 },
      { exerciseId: 'elevaciones-laterales-polea', defaultSets: 3, defaultReps: 12, defaultWeight: 10 },
      { exerciseId: 'press-frances-mancuernas', defaultSets: 3, defaultReps: 10, defaultWeight: 16 },
    ],
  },
  {
    id: 'template-fullbody',
    name: 'Rutina Full Body (Cuerpo Completo)',
    type: 'Full Body',
    description: 'Estímulo sistémico de alta frecuencia con los movimientos multiarticulares más eficientes.',
    focusMuscles: ['Piernas', 'Pecho', 'Espalda', 'Hombros', 'Core'],
    estimatedMinutes: 65,
    exercises: [
      { exerciseId: 'sentadilla-trasera-barra', defaultSets: 3, defaultReps: 8, defaultWeight: 85 },
      { exerciseId: 'press-banca-barra', defaultSets: 3, defaultReps: 8, defaultWeight: 75 },
      { exerciseId: 'remo-gironda-polea', defaultSets: 3, defaultReps: 10, defaultWeight: 60 },
      { exerciseId: 'peso-muerto-rumano', defaultSets: 3, defaultReps: 10, defaultWeight: 80 },
      { exerciseId: 'rueda-abdominal', defaultSets: 3, defaultReps: 12, defaultWeight: 0 },
    ],
  },
];

export function buildWorkoutExercisesFromTemplate(template: RoutineTemplate): WorkoutExercise[] {
  return template.exercises.map((item) => {
    const def = EXERCISE_DATABASE.find((e) => e.id === item.exerciseId);
    return {
      exerciseId: item.exerciseId,
      exerciseName: def ? def.name : item.exerciseId,
      muscleGroup: def ? def.muscleGroup : 'Pecho',
      sets: Array.from({ length: item.defaultSets }, (_, i) => ({
        id: `set-${item.exerciseId}-${i + 1}-${Date.now()}`,
        setNumber: i + 1,
        weightKg: item.defaultWeight,
        reps: item.defaultReps,
        rpe: 8,
        completed: false,
      })),
    };
  });
}
