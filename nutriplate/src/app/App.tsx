import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ensureSeeded } from '@/db/seed';
import { useProfile } from '@/lib/hooks';
import { Spinner, ToastHost } from '@/components/ui';
import { Layout } from './Layout';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { HomePage } from '@/features/home/HomePage';
import { MealsPage } from '@/features/meals/MealsPage';
import { RecipePage } from '@/features/meals/RecipePage';
import { AirFryerPage } from '@/features/meals/AirFryerPage';
import { SnackPage } from '@/features/meals/SnackPage';
import { RecipeEditorPage } from '@/features/meals/RecipeEditorPage';
import { JournalPage } from '@/features/journal/JournalPage';
import { PlanPage } from '@/features/plan/PlanPage';
import { ShoppingPage } from '@/features/plan/ShoppingPage';
import { SportPage } from '@/features/sport/SportPage';
import { WorkoutPage } from '@/features/sport/WorkoutPage';
import { ProgressPage } from '@/features/progress/ProgressPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { PreferencesPage } from '@/features/profile/PreferencesPage';

export function App() {
  const [seeded, setSeeded] = useState(false);
  const profile = useProfile();
  useEffect(() => {
    ensureSeeded().then(() => setSeeded(true));
  }, []);
  if (!seeded || profile === undefined) return <Spinner />;
  const onboarded = profile?.onboarded === true;
  return (
    <HashRouter>
      <ToastHost />
      <Routes>
        {!onboarded ? (
          <>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </>
        ) : (
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/repas" element={<MealsPage />} />
            <Route path="/repas/airfryer" element={<AirFryerPage />} />
            <Route path="/repas/faim" element={<SnackPage />} />
            <Route path="/repas/nouvelle" element={<RecipeEditorPage />} />
            <Route path="/repas/:id/modifier" element={<RecipeEditorPage />} />
            <Route path="/repas/:id" element={<RecipePage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/semaine" element={<PlanPage />} />
            <Route path="/courses" element={<ShoppingPage />} />
            <Route path="/sport" element={<SportPage />} />
            <Route path="/sport/:id" element={<WorkoutPage />} />
            <Route path="/progres" element={<ProgressPage />} />
            <Route path="/profil" element={<ProfilePage />} />
            <Route path="/profil/preferences" element={<PreferencesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </HashRouter>
  );
}
