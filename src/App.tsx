import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  initAuth,
  db,
  auth,
  getAccessToken,
  handleFirestoreError,
  OperationType,
} from './firebase';
import { Navbar, ActiveTab } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { ActiveWorkout } from './components/ActiveWorkout';
import { GeminiCoachVoice } from './components/GeminiCoachVoice';
import { WorkoutHistory } from './components/WorkoutHistory';
import { ExerciseLibrary } from './components/ExerciseLibrary';
import { ProgressTracker } from './components/ProgressTracker';
import { RestTimer } from './components/RestTimer';
import { AuthModal } from './components/AuthModal';
import { ExportSheetsModal, ScheduleCalendarModal } from './components/WorkspaceModals';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AthleteProfileScreen } from './components/AthleteProfileScreen';
import { RoutineCreator } from './components/RoutineCreator';
import { WorkoutSession, BodyMetric, AthleteProfile, CustomRoutine } from './types/fitness';
import { exportWorkoutToGoogleSheets, scheduleWorkoutInGoogleCalendar } from './services/workspace';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [athleteProfile, setAthleteProfile] = useState<AthleteProfile | null>(null);
  const [customRoutines, setCustomRoutines] = useState<CustomRoutine[]>([]);
  const [activePresetRoutine, setActivePresetRoutine] = useState<CustomRoutine | null>(null);
  const [voiceLoggedData, setVoiceLoggedData] = useState<any>(null);

  // Modals & Timers
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [timerInitialSecs, setTimerInitialSecs] = useState(90);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Workspace integration modals
  const [sheetsModalWorkout, setSheetsModalWorkout] = useState<WorkoutSession | null>(null);
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [calendarModalWorkout, setCalendarModalWorkout] = useState<WorkoutSession | null>(null);
  const [isSchedulingCalendar, setIsSchedulingCalendar] = useState(false);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Auth Initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setCurrentUser(user);
      },
      () => {
        setCurrentUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Compute effective user ID (fallback to guest session ID saved in localStorage if not logged in)
  const effectiveUserId = currentUser?.uid || (() => {
    let localId = localStorage.getItem('aurafit_guest_uid');
    if (!localId) {
      localId = 'guest_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('aurafit_guest_uid', localId);
    }
    return localId;
  })();

  // Real-time Firestore sync for Workouts
  useEffect(() => {
    if (!currentUser) {
      // Load local sample or cache
      const cached = localStorage.getItem(`aurafit_workouts_${effectiveUserId}`);
      if (cached) {
        try {
          setWorkouts(JSON.parse(cached));
        } catch (_) {}
      }
      return;
    }

    const path = `users/${currentUser.uid}/workouts`;
    const q = query(collection(db, path), orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: WorkoutSession[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...(doc.data() as any) });
        });
        setWorkouts(items);
        localStorage.setItem(`aurafit_workouts_${currentUser.uid}`, JSON.stringify(items));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, [currentUser, effectiveUserId]);

  // Real-time Firestore sync for Body Metrics
  useEffect(() => {
    if (!currentUser) {
      const cached = localStorage.getItem(`aurafit_metrics_${effectiveUserId}`);
      if (cached) {
        try {
          setMetrics(JSON.parse(cached));
        } catch (_) {}
      }
      return;
    }

    const path = `users/${currentUser.uid}/metrics`;
    const q = query(collection(db, path), orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: BodyMetric[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...(doc.data() as any) });
        });
        setMetrics(items);
        localStorage.setItem(`aurafit_metrics_${currentUser.uid}`, JSON.stringify(items));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, [currentUser, effectiveUserId]);

  // Real-time Firestore sync for Athlete Profile
  useEffect(() => {
    const cached = localStorage.getItem(`aurafit_profile_${effectiveUserId}`);
    if (cached) {
      try {
        setAthleteProfile(JSON.parse(cached));
      } catch (_) {}
    }

    if (!currentUser) return;

    const profileRef = doc(db, 'users', currentUser.uid, 'profile', 'main');
    const unsubscribe = onSnapshot(
      profileRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as AthleteProfile;
          setAthleteProfile(data);
          localStorage.setItem(`aurafit_profile_${currentUser.uid}`, JSON.stringify(data));
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}/profile/main`);
      }
    );

    return () => unsubscribe();
  }, [currentUser, effectiveUserId]);

  // Real-time Firestore sync for Custom Routines
  useEffect(() => {
    const cached = localStorage.getItem(`aurafit_custom_routines_${effectiveUserId}`);
    if (cached) {
      try {
        setCustomRoutines(JSON.parse(cached));
      } catch (_) {}
    }

    if (!currentUser) return;

    const path = `users/${currentUser.uid}/customRoutines`;
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: CustomRoutine[] = [];
        snapshot.forEach((d) => {
          items.push({ id: d.id, ...(d.data() as any) });
        });
        setCustomRoutines(items);
        localStorage.setItem(`aurafit_custom_routines_${currentUser.uid}`, JSON.stringify(items));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, [currentUser, effectiveUserId]);

  // Handler when workout is completed
  const handleWorkoutSaved = (session: WorkoutSession) => {
    setWorkouts((prev) => [session, ...prev.filter((w) => w.id !== session.id)]);
    showToast(`¡Entrenamiento "${session.title}" guardado con éxito!`);
    // Prompt Google Sheets export
    setSheetsModalWorkout(session);
  };

  // Handler for voice coach logWorkout
  const handleVoiceWorkoutLog = (
    exercise: string,
    sets: number,
    reps: number,
    weight: number,
    rpe?: number
  ) => {
    setVoiceLoggedData({ exercise, sets, reps, weight, rpe, timestamp: Date.now() });
    showToast(`🎙️ Coach IA registró: ${exercise} (${sets}x${reps} @ ${weight}kg)`);
  };

  // Open rest timer helper
  const handleOpenTimerWithSecs = (seconds: number = 90) => {
    setTimerInitialSecs(seconds);
    setIsTimerOpen(true);
  };

  // Google Sheets Export Execution
  const handleConfirmExportSheets = async () => {
    if (!sheetsModalWorkout) return;
    setIsExportingSheets(true);

    try {
      const token = await getAccessToken();
      if (!token) {
        setIsAuthOpen(true);
        throw new Error('Por favor inicia sesión con Google para autorizar la exportación a Google Sheets.');
      }

      const result = await exportWorkoutToGoogleSheets(
        token,
        sheetsModalWorkout,
        (sheetsModalWorkout as any).spreadsheetId
      );

      // Update workout with sheets url
      if (currentUser && sheetsModalWorkout.id) {
        try {
          await updateDoc(doc(db, 'users', currentUser.uid, 'workouts', sheetsModalWorkout.id), {
            syncedToSheets: true,
            spreadsheetUrl: result.spreadsheetUrl,
          });
        } catch (_) {}
      }

      showToast('¡Entrenamiento exportado a Google Sheets correctamente!');
      setSheetsModalWorkout(null);
    } catch (err: any) {
      console.error('Error exportando a Sheets:', err);
      showToast(err.message || 'Error al exportar a Google Sheets', 'error');
    } finally {
      setIsExportingSheets(false);
    }
  };

  // Google Calendar Scheduling Execution
  const handleConfirmScheduleCalendar = async (scheduledDate: Date, durationMinutes: number) => {
    if (!calendarModalWorkout) return;
    setIsSchedulingCalendar(true);

    try {
      const token = await getAccessToken();
      if (!token) {
        setIsAuthOpen(true);
        throw new Error('Por favor inicia sesión con Google para agendar en Google Calendar.');
      }

      const exercisesSummary = calendarModalWorkout.exercises.map(
        (e) => `${e.exerciseName} (${e.sets.length} series)`
      );

      const result = await scheduleWorkoutInGoogleCalendar(token, {
        routineTitle: calendarModalWorkout.title,
        routineType: calendarModalWorkout.routineType,
        scheduledAt: scheduledDate,
        durationMinutes,
        exercisesSummary,
      });

      showToast('¡Sesión agendada en tu Google Calendar!');
      setCalendarModalWorkout(null);
    } catch (err: any) {
      console.error('Error agendando en Calendar:', err);
      showToast(err.message || 'Error al agendar en Google Calendar', 'error');
    } finally {
      setIsSchedulingCalendar(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-zinc-950">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenTimer={() => handleOpenTimerWithSecs(90)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            workouts={workouts}
            metrics={metrics}
            athleteProfile={athleteProfile}
            onStartTraining={() => setActiveTab('workout')}
            onOpenCoach={() => setActiveTab('coach')}
            onOpenTimer={() => handleOpenTimerWithSecs(90)}
            onOpenProgress={() => setActiveTab('progress')}
            onOpenHistory={() => setActiveTab('history')}
            onOpenProfile={() => setActiveTab('profile')}
            onOpenCreator={() => setActiveTab('creator')}
          />
        )}

        {activeTab === 'workout' && (
          <ActiveWorkout
            userId={effectiveUserId}
            onWorkoutSaved={handleWorkoutSaved}
            onRequestExportSheets={(w) => setSheetsModalWorkout(w)}
            onRequestScheduleCalendar={(w) => setCalendarModalWorkout(w)}
            onOpenTimer={handleOpenTimerWithSecs}
            voiceLoggedData={voiceLoggedData}
            customRoutines={customRoutines}
            activePresetRoutine={activePresetRoutine}
            onClearPresetRoutine={() => setActivePresetRoutine(null)}
          />
        )}

        {activeTab === 'coach' && (
          <div className="h-[calc(100vh-140px)] min-h-[500px]">
            <GeminiCoachVoice
              onLogWorkout={handleVoiceWorkoutLog}
              activeRoutineName={workouts.length > 0 ? workouts[0].title : undefined}
              onOpenTimer={handleOpenTimerWithSecs}
            />
          </div>
        )}

        {activeTab === 'profile' && (
          <AthleteProfileScreen
            userId={effectiveUserId}
            metrics={metrics}
            initialProfile={athleteProfile}
            onProfileUpdated={(updatedProfile) => {
              setAthleteProfile(updatedProfile);
              showToast('¡Perfil de atleta y métricas basales actualizados!');
            }}
            onNavigateToRoutineCreator={() => setActiveTab('creator')}
          />
        )}

        {activeTab === 'creator' && (
          <RoutineCreator
            userId={effectiveUserId}
            athleteProfile={athleteProfile}
            savedRoutines={customRoutines}
            onSaveRoutine={(routine) => {
              setCustomRoutines((prev) => [routine, ...prev.filter((r) => r.id !== routine.id)]);
              showToast(`¡Rutina "${routine.name}" guardada en Firestore!`);
            }}
            onDeleteRoutine={(id) => {
              setCustomRoutines((prev) => prev.filter((r) => r.id !== id));
              showToast('Rutina eliminada de tu biblioteca.');
            }}
            onStartRoutineNow={(routine) => {
              setActivePresetRoutine(routine);
              setActiveTab('workout');
              showToast(`Iniciando sesión con rutina: "${routine.name}"`);
            }}
          />
        )}

        {activeTab === 'history' && (
          <WorkoutHistory
            userId={effectiveUserId}
            workouts={workouts}
            onDeleteWorkout={(id) => setWorkouts((prev) => prev.filter((w) => w.id !== id))}
            onUpdateWorkout={(updatedWorkout) => {
              setWorkouts((prev) => prev.map((w) => (w.id === updatedWorkout.id ? updatedWorkout : w)));
              showToast('¡Entrenamiento actualizado!');
            }}
            onRequestExportSheets={(w) => setSheetsModalWorkout(w)}
            onRequestScheduleCalendar={(w) => setCalendarModalWorkout(w)}
          />
        )}

        {activeTab === 'library' && <ExerciseLibrary />}

        {activeTab === 'progress' && (
          <ProgressTracker
            userId={effectiveUserId}
            metrics={metrics}
            onAddMetric={(m) => setMetrics((prev) => [m, ...prev])}
            onDeleteMetric={(id) => setMetrics((prev) => prev.filter((m) => m.id !== id))}
          />
        )}
      </main>

      {/* Floating Gym Rest Timer */}
      <RestTimer
        isOpen={isTimerOpen}
        initialSeconds={timerInitialSecs}
        onClose={() => setIsTimerOpen(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onAuthSuccess={(user, token) => {
          setCurrentUser(user);
          showToast(`¡Bienvenido, ${user.displayName || user.email}!`);
        }}
      />

      {/* Workspace Google Sheets Modal */}
      <ExportSheetsModal
        isOpen={!!sheetsModalWorkout}
        onClose={() => setSheetsModalWorkout(null)}
        workout={sheetsModalWorkout}
        onConfirm={handleConfirmExportSheets}
        isLoading={isExportingSheets}
      />

      {/* Workspace Google Calendar Modal */}
      <ScheduleCalendarModal
        isOpen={!!calendarModalWorkout}
        onClose={() => setCalendarModalWorkout(null)}
        routineTitle={calendarModalWorkout?.title || 'Entrenamiento de Fuerza'}
        routineType={calendarModalWorkout?.routineType || 'Fuerza'}
        exercisesList={
          calendarModalWorkout?.exercises.map((e) => e.exerciseName) || []
        }
        onConfirm={handleConfirmScheduleCalendar}
        isLoading={isSchedulingCalendar}
      />

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`fixed top-18 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md text-xs font-bold transition animate-slide-in ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/90 text-zinc-950 border border-emerald-400'
              : 'bg-red-500/90 text-white border border-red-400'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-zinc-950" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* PWA Offline indicator */}
      <OfflineIndicator />
    </div>
  );
}
