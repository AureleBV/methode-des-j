import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/domain/preferences';
import type { PreferenceLevel } from '@/domain/types';
import { setPreference } from '@/lib/actions';
import { useFoods } from '@/lib/hooks';
import { Note, PageHeader } from '@/components/ui';
import { PreferencePicker } from './PreferencePicker';

export function PreferencesPage() {
  const nav = useNavigate();
  const foods = useFoods();
  const prefsQ = useLiveQuery(() => db.preferences.toArray(), []);
  const prefs = useMemo(() => prefsQ ?? [], [prefsQ]);
  const foodPrefs = useMemo(() => Object.fromEntries(prefs.filter((p) => p.targetType === 'food').map((p) => [p.targetId, p.level])) as Record<string, PreferenceLevel>, [prefs]);
  const tagPrefs = useMemo(() => Object.fromEntries(prefs.filter((p) => p.targetType === 'tag').map((p) => [p.targetId, p.level])) as Record<string, PreferenceLevel>, [prefs]);
  const hated = prefs.filter((p) => p.level === 'hate' || p.level === 'allergy').length;
  return (
    <div className="fade-in space-y-3">
      <PageHeader title="Mes goûts" subtitle={`${hated} aliment${hated > 1 ? 's' : ''} évité${hated > 1 ? 's' : ''}`} back={() => nav(-1)} />
      <Note>😍 adoré = priorisé · 🙅 détesté = quasiment jamais proposé, substitution automatique · ⚠️ allergie = recette bloquée.</Note>
      <PreferencePicker foods={foods} prefs={foodPrefs} tagPrefs={tagPrefs} onFood={(id, l) => setPreference('food', id, l)} onTag={(t, l) => setPreference('tag', t, l)} categories={CATEGORY_ORDER.filter((c) => !['drink', 'other'].includes(c))} labels={CATEGORY_LABELS} />
    </div>
  );
}
