import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ACTIVITY_LABELS, GOAL_LABELS, PACE_LABELS } from '@/domain/nutrition';
import { SLOT_LABELS } from '@/domain/planner';
import type { AccentTheme, ActivityLevel, Diet, Equipment, Goal, GoalPace, MealSlot, Sex, UserProfile } from '@/domain/types';
import { exportAll, importAll, setUsualVariant, updateProfile } from '@/lib/actions';
import { useFoods, useProfile, useTargets } from '@/lib/hooks';
import { getVisionSettings, setVisionSettings, type VisionProvider } from '@/services/vision';
import { activeProfileId, listProfiles } from '@/db/profiles';
import { Button, Card, Chip, ChipRow, Field, Input, Note, NumberInput, PageHeader, SectionTitle, Segmented, Select, Toggle, toast } from '@/components/ui';
import { DIET_LABELS } from '@/features/onboarding/OnboardingPage';
import { EQUIPMENT_LABELS } from '@/features/meals/RecipeCard';
import { ProfilesSheet } from './ProfilesSheet';

export const ACCENTS: { value: AccentTheme; label: string; color: string }[] = [
  { value: 'green', label: 'Vert', color: '#1f7a5c' },
  { value: 'blue', label: 'Bleu', color: '#2f6fb3' },
  { value: 'coral', label: 'Corail', color: '#d9705a' },
  { value: 'violet', label: 'Violet', color: '#6c5bd4' },
  { value: 'amber', label: 'Ambre', color: '#b8760f' },
];
const AVATARS = ['🙂', '😎', '🧑‍🍳', '💪', '🦊', '🐼', '🌻', '🚀', '🎯', '🍀', '🐱', '🦁'];
const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];

export function ProfilePage() {
  const profile = useProfile();
  if (!profile) return null;
  // key = updatedAt : le formulaire repart des valeurs enregistrées après chaque sauvegarde.
  return <ProfileForm key={profile.updatedAt} profile={profile} />;
}

function ProfileForm({ profile }: { profile: UserProfile }) {
  const targets = useTargets(profile);
  const foods = useFoods();
  const [form, setForm] = useState(profile);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [vision, setVision] = useState<{ provider: VisionProvider; geminiKey: string }>({ provider: 'local', geminiKey: '' });
  useEffect(() => {
    getVisionSettings().then(setVision);
  }, []);
  if (!targets) return null;
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm({ ...form, [k]: v });
  const me = listProfiles().find((p) => p.id === activeProfileId());
  const slots = form.slots ?? (form.eatsBreakfast ? SLOTS : SLOTS.filter((s) => s !== 'breakfast'));
  const groups = [...new Map(foods.filter((f) => f.variantGroup && f.source === 'local').map((f) => [f.variantGroup!, f])).keys()];

  async function save() {
    await updateProfile({
      firstName: form.firstName, avatar: form.avatar, accent: form.accent, age: form.age, sex: form.sex, heightCm: form.heightCm, weightKg: form.weightKg, targetWeightKg: form.targetWeightKg, activity: form.activity, sessionsPerWeek: form.sessionsPerWeek, goal: form.goal, pace: form.pace, proteinPerKg: form.proteinPerKg,
      equipment: form.equipment.length ? form.equipment : ['none'], diet: form.diet, eatsBreakfast: slots.includes('breakfast'), slots, mealTimes: form.mealTimes, gentleMode: form.gentleMode, kcalAdjustment: form.kcalAdjustment, waterGoalMl: form.waterGoalMl,
    });
    await setVisionSettings(vision);
    toast('Profil enregistré');
  }

  return (
    <div className="fade-in space-y-4">
      <PageHeader title="Profil" right={<Link to="/profil/preferences" className="rounded-full bg-primary-soft px-3 py-2 text-sm font-semibold text-primary">Mes goûts</Link>} />

      <Card className="flex items-center gap-3">
        <span className="text-4xl">{form.avatar ?? me?.emoji ?? '🙂'}</span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{form.firstName || me?.name || 'Moi'}</div>
          <div className="text-xs text-muted">{listProfiles().length} profil{listProfiles().length > 1 ? 's' : ''} sur cet appareil</div>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setProfilesOpen(true)}>Profils</Button>
      </Card>

      <Card>
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold">Objectif du jour</span>
          <span className="text-2xl font-bold text-primary">{targets.kcal} kcal</span>
        </div>
        <p className="text-sm text-muted">P {targets.protein} g · G {targets.carbs} g · L {targets.fat} g · base ≈ {targets.bmr} kcal, dépense ≈ {targets.tdee} kcal{targets.delta ? `, ${targets.delta > 0 ? '+' : ''}${targets.delta} kcal` : ''}.</p>
        <p className="mt-1 text-xs text-muted">Estimations (Mifflin-St Jeor). À ajuster avec l’évolution réelle, onglet Progrès.</p>
      </Card>

      <SectionTitle>Toi</SectionTitle>
      <Field label="Prénom"><Input value={form.firstName ?? ''} onChange={(e) => set('firstName', e.target.value || undefined)} /></Field>
      <Field label="Avatar">
        <ChipRow>{AVATARS.map((a) => <Chip key={a} active={(form.avatar ?? '🙂') === a} onClick={() => set('avatar', a)}>{a}</Chip>)}</ChipRow>
      </Field>
      <Field label="Couleur de l’app">
        <div className="flex gap-2">
          {ACCENTS.map((a) => (
            <button key={a.value} type="button" onClick={() => set('accent', a.value)} aria-label={a.label} title={a.label} className={`h-9 w-9 rounded-full transition ${(form.accent ?? 'green') === a.value ? 'ring-2 ring-offset-2 ring-ink' : ''}`} style={{ background: a.color }} />
          ))}
        </div>
      </Field>
      <Segmented value={form.sex} onChange={(v: Sex) => set('sex', v)} options={[{ value: 'male', label: 'Homme' }, { value: 'female', label: 'Femme' }]} />
      <div className="grid grid-cols-3 gap-3">
        <Field label="Âge"><NumberInput value={form.age} onChange={(v) => set('age', v)} min={14} max={100} suffix="ans" /></Field>
        <Field label="Taille"><NumberInput value={form.heightCm} onChange={(v) => set('heightCm', v)} min={120} max={230} suffix="cm" /></Field>
        <Field label="Poids"><NumberInput value={form.weightKg} onChange={(v) => set('weightKg', v)} min={30} max={300} step={0.1} suffix="kg" /></Field>
      </div>

      <SectionTitle>Objectif</SectionTitle>
      <Field label="Objectif">
        <Select value={form.goal} onChange={(e) => set('goal', e.target.value as Goal)}>
          {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => <option key={g} value={g}>{GOAL_LABELS[g]}</option>)}
        </Select>
      </Field>
      {form.goal === 'lose' && (
        <Field label="Rythme" hint={PACE_LABELS[form.pace ?? 'moderee'].hint}>
          <Segmented value={form.pace ?? 'moderee'} onChange={(v: GoalPace) => set('pace', v)} options={(Object.keys(PACE_LABELS) as GoalPace[]).map((p) => ({ value: p, label: PACE_LABELS[p].label }))} />
        </Field>
      )}
      <Field label="Protéines" hint="g par kg de poids de référence. 1,6 à 2,2 g/kg couvre la quasi-totalité des cas.">
        <ChipRow>{[1.4, 1.6, 1.8, 2.0, 2.2].map((v) => <Chip key={v} active={(form.proteinPerKg ?? (form.goal === 'maintain' ? 1.6 : 1.8)) === v} onClick={() => set('proteinPerKg', v)}>{v.toFixed(1)} g/kg</Chip>)}</ChipRow>
      </Field>
      <Field label="Poids visé (facultatif)"><NumberInput value={form.targetWeightKg ?? 0} onChange={(v) => set('targetWeightKg', v || undefined)} min={0} max={300} step={0.5} suffix="kg" /></Field>
      <Field label="Activité quotidienne">
        <Select value={form.activity} onChange={(e) => set('activity', e.target.value as ActivityLevel)}>
          {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>)}
        </Select>
      </Field>
      <Field label="Séances de sport / semaine">
        <ChipRow>{[0, 1, 2, 3, 4, 5, 6].map((n) => <Chip key={n} active={form.sessionsPerWeek === n} onClick={() => set('sessionsPerWeek', n)}>{n === 6 ? '6+' : n}</Chip>)}</ChipRow>
      </Field>
      <Field label="Ajustement manuel" hint="Delta appliqué à l’objectif calculé. Le plancher de sécurité reste actif."><NumberInput value={form.kcalAdjustment} onChange={(v) => set('kcalAdjustment', v)} min={-500} max={500} step={50} suffix="kcal" /></Field>
      <Card>
        <Toggle label="Mode douceur (objectif proche du maintien, aucun message de restriction)" checked={form.gentleMode} onChange={(v) => set('gentleMode', v)} />
      </Card>

      <SectionTitle>Mes repas</SectionTitle>
      <Card className="space-y-2">
        {SLOTS.map((s) => (
          <div key={s} className="flex items-center gap-3">
            <input type="checkbox" checked={slots.includes(s)} onChange={(e) => set('slots', e.target.checked ? SLOTS.filter((x) => x === s || slots.includes(x)) : slots.filter((x) => x !== s))} className="h-5 w-5 accent-[var(--primary)]" aria-label={SLOT_LABELS[s]} />
            <span className="flex-1 text-sm">{SLOT_LABELS[s]}</span>
            <input type="time" value={form.mealTimes?.[s] ?? { breakfast: '08:00', lunch: '12:30', snack: '16:30', dinner: '20:00', other: '' }[s]} onChange={(e) => set('mealTimes', { ...(form.mealTimes ?? {}), [s]: e.target.value })} className="rounded-lg border border-line bg-surface px-2 py-1 text-sm" aria-label={`Heure ${SLOT_LABELS[s]}`} />
          </div>
        ))}
        <p className="text-xs text-muted">Utilisé pour le planning de la semaine et le compte des repas restants.</p>
      </Card>

      <SectionTitle>Mes habitudes</SectionTitle>
      <Card className="space-y-2">
        <p className="text-xs text-muted">Pour chaque famille, la version que tu prends vraiment (présélectionnée à l’ajout). Vide = on te propose la plus légère.</p>
        {groups.map((g) => {
          const opts = foods.filter((f) => f.variantGroup === g).sort((a, b) => (a.variantRank ?? 0) - (b.variantRank ?? 0));
          const cur = form.usualVariants?.[g] ?? '';
          return (
            <div key={g} className="flex items-center gap-2">
              <span className="w-28 shrink-0 truncate text-sm">{opts[0]!.name.replace(/\s*\(.*\)\s*/, '').split(' ').slice(0, 2).join(' ')}</span>
              <select value={cur} onChange={async (e) => { await setUsualVariant(g, e.target.value || null); }} className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 py-1 text-sm">
                <option value="">— la plus légère —</option>
                {opts.map((o) => <option key={o.id} value={o.id}>{o.variantLabel} · {o.per100.kcal} kcal</option>)}
              </select>
            </div>
          );
        })}
      </Card>

      <SectionTitle>Cuisine</SectionTitle>
      <ChipRow>
        {(['microwave', 'pan', 'airfryer', 'oven'] as Equipment[]).map((e) => (
          <Chip key={e} active={form.equipment.includes(e)} onClick={() => set('equipment', form.equipment.includes(e) ? form.equipment.filter((x) => x !== e) : [...form.equipment.filter((x) => x !== 'none'), e])}>{EQUIPMENT_LABELS[e]}</Chip>
        ))}
      </ChipRow>
      <Field label="Régime">
        <Select value={form.diet} onChange={(e) => set('diet', e.target.value as Diet)}>
          {(Object.keys(DIET_LABELS) as Diet[]).map((d) => <option key={d} value={d}>{DIET_LABELS[d]}</option>)}
        </Select>
      </Field>
      <Field label="Objectif eau"><NumberInput value={form.waterGoalMl} onChange={(v) => set('waterGoalMl', v)} step={250} suffix="ml" /></Field>

      <SectionTitle>Analyse photo</SectionTitle>
      <Card className="space-y-2">
        <Segmented value={vision.provider} onChange={(v: VisionProvider) => setVision({ ...vision, provider: v })} options={[{ value: 'local', label: 'Sur l’appareil' }, { value: 'gemini', label: 'Gemini (ma clé)' }]} />
        {vision.provider === 'local' ? (
          <p className="text-xs text-muted">Gratuit, sans compte : le modèle tourne dans le navigateur, aucune photo n’est envoyée. Reconnaissance approximative, tu confirmes.</p>
        ) : (
          <>
            <Input type="password" placeholder="Clé API Gemini (aistudio.google.com)" value={vision.geminiKey} onChange={(e) => setVision({ ...vision, geminiKey: e.target.value })} />
            <p className="text-xs text-muted">Google propose une offre gratuite pour cette API. Les photos analysées sont envoyées à Google avec ta clé ; la clé reste sur ton appareil. Meilleure reconnaissance et estimation des quantités.</p>
          </>
        )}
      </Card>

      <Button block size="lg" onClick={save}>Enregistrer</Button>

      <SectionTitle>Données</SectionTitle>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={async () => { const json = await exportAll(); const blob = new Blob([json], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `nutriplate-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href); }}>Exporter (JSON)</Button>
        <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-surface-2 px-4 py-2.5 text-[15px] font-semibold">
          Importer
          <input type="file" accept="application/json" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { await importAll(await f.text()); toast('Données importées'); } catch { toast('Fichier invalide'); } }} />
        </label>
      </div>
      <Note>Tout reste sur ton appareil (aucun compte, aucun serveur, aucun cookie). <Link to="/profil/confidentialite" className="font-semibold underline">Données & confidentialité</Link>.</Note>
      {profilesOpen && <ProfilesSheet onClose={() => setProfilesOpen(false)} />}
    </div>
  );
}
