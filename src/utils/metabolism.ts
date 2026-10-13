import { Gender, ActivityLevel, FitnessGoal } from '../types/fitness';

/**
 * Mifflin-St Jeor Basal Metabolic Rate (BMR) Formula
 * Based on sports nutrition evidence:
 * Men: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5
 * Women: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) - 161
 */
export function calculateMifflinStJeor(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender
): number {
  if (weightKg <= 0 || heightCm <= 0 || age <= 0) return 0;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(gender === 'hombre' ? base + 5 : base - 161);
}

/**
 * Total Daily Energy Expenditure (TDEE) based on activity factor
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const multipliers: Record<ActivityLevel, number> = {
    sedentario: 1.2, // Poco o ningún ejercicio, trabajo de oficina
    ligero: 1.375, // 1-3 días de entrenamiento ligero
    moderado: 1.55, // 3-5 días de fuerza/entrenamiento moderado
    activo: 1.725, // 6-7 días de entrenamiento intenso
    muy_activo: 1.9, // Atleta de competición o trabajo físico + entreno
  };
  return Math.round(bmr * (multipliers[activityLevel] || 1.55));
}

/**
 * Target Calories adjusted for specific athletic goal
 */
export function calculateTargetCalories(tdee: number, goal: FitnessGoal): number {
  switch (goal) {
    case 'volumen':
      // Superávit calórico controlado de ~300-350 kcal (+10-15%) para hipertrofia con mínima adiposidad
      return Math.round(tdee + 350);
    case 'definicion':
      // Déficit moderado de ~400-500 kcal (-20%) para retención muscular máxima
      return Math.round(Math.max(1200, tdee - 450));
    case 'recomposicion':
      // Normocalórica para atletas principiantes, intermedios retornando o con sobrepeso relativo
      return Math.round(tdee);
  }
}

/**
 * Scientific Daily Protein Requirement (Morton et al., Helms et al.)
 * Range: 1.6 to 2.4 g/kg/day depending on energy balance
 */
export function calculateProteinGrams(weightKg: number, goal: FitnessGoal): {
  minGrams: number;
  maxGrams: number;
  recommendedGrams: number;
  perKg: number;
} {
  let perKg = 1.8;
  let min = 1.6;
  let max = 2.2;

  if (goal === 'definicion') {
    // En déficit, la degradación proteica aumenta; 2.2-2.4 g/kg preserva tejido magro y saciedad
    min = 2.0;
    max = 2.4;
    perKg = 2.2;
  } else if (goal === 'volumen') {
    // En superávit, 1.6-2.0 g/kg satura completamente la síntesis proteica miofibrilar (MPS)
    min = 1.6;
    max = 2.0;
    perKg = 1.8;
  } else {
    // Recomposición
    min = 1.8;
    max = 2.2;
    perKg = 2.0;
  }

  return {
    minGrams: Math.round(weightKg * min),
    maxGrams: Math.round(weightKg * max),
    recommendedGrams: Math.round(weightKg * perKg),
    perKg,
  };
}

/**
 * Body Mass Index (BMI) & interpretation
 */
export function calculateBMI(weightKg: number, heightCm: number): {
  bmi: number;
  category: string;
} {
  if (weightKg <= 0 || heightCm <= 0) return { bmi: 0, category: 'N/A' };
  const hMeters = heightCm / 100;
  const bmi = parseFloat((weightKg / (hMeters * hMeters)).toFixed(1));
  let category = 'Normal';
  if (bmi < 18.5) category = 'Bajo peso';
  else if (bmi < 24.9) category = 'Normopeso';
  else if (bmi < 29.9) category = 'Sobrepeso (posible masa muscular alta)';
  else category = 'Obesidad (requiere recomposición)';

  return { bmi, category };
}

/**
 * Lean Body Mass & Fat Mass calculation
 */
export function calculateBodyComposition(weightKg: number, bodyFatPercent?: number) {
  if (!bodyFatPercent || bodyFatPercent <= 0) return null;
  const fatMassKg = parseFloat(((weightKg * bodyFatPercent) / 100).toFixed(1));
  const leanMassKg = parseFloat((weightKg - fatMassKg).toFixed(1));
  return { fatMassKg, leanMassKg };
}
