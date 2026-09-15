import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ACTIVITY_LABELS, GOAL_LABELS } from '@/domain/nutrition';
import type { ActivityLevel, Diet, Equipment, Goal, Sex, UserProfile } from '@/domain/types';
import { exportAll, importAll, updateProfile } from '@/lib/actions';
import { useProfile, useTargets } from '@/lib/hooks';
import { Button, Card, Chip, ChipRow, Field, Input, Note, NumberInput, PageHeader, SectionTitle, Segmented, Select, Toggle, toast } from '@/components/ui';
import { DIET_LABELS } from '@/features/onboarding/OnboardingPage';
import { EQUIPMENT_LABELS } from '@/features/meals/RecipeCard';

export function ProfilePage() {
  const profile = useProfile();
  if (!profile) return null;
  // key = updatedAt : le formulaire repart des valeurs enregistrées après chaque sauvegarde.
  return <ProfileForm key={profile.updatedAt} profile={profile} />;
}

function ProfileForm({ profile }: { profile: UserProfile }) {
  const targets = useTargets(profile);
  const [form, setForm] = useState(profile);
  if (!targets) return null;
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm({ ...form, [k]: v });

  async function save() {
    if (!form) return;
    await updateProfile({ firstName: form.firstName, age: form.age, sex: form.sex, heightCm: form.heightCm, weightKg: form.weightKg, targetWeightKg: form.targetWeightKg, activity: form.activity, sessionsPerWeek: form.sessionsPerWeek, goal: form.goal, equipment: form.equipment.length ? form.equipment : ['none'], diet: form.diet, eatsBreakfast: form.eatsBreakfast, gentleMode: form.gentleMode, kcalAdjustment: form.kcalAdjustment, waterGoalMl: form.waterGoalMl });
    toast('Profil enregistré');
  }

  return (
    <div className="fade-in space-y-4">
      <PageHeader title="Profil" right={<Link to="/profil/preferences" className="rounded-full bg-primary-soft px-3 py-2 text-sm font-semibold text-primary">Mes goûts</Link>} />

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
        <Toggle label="Je prends un petit-déjeuner" checked={form.eatsBreakfast} onChange={(v) => set('eatsBreakfast', v)} />
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
      <Button block size="lg" onClick={save}>Enregistrer</Button>

      <SectionTitle>Données</SectionTitle>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={async () => { const json = await exportAll(); const blob = new Blob([json], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `nutriplate-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href); }}>Exporter (JSON)</Button>
        <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-surface-2 px-4 py-2.5 text-[15px] font-semibold">
          Importer
          <input type="file" accept="application/json" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { await importAll(await f.text()); toast('Données importées'); } catch { toast('Fichier invalide'); } }} />
        </label>
      </div>
      <Note>Tout reste sur ton appareil (aucun compte, aucun serveur). L’export sert de sauvegarde ou pour changer de téléphone.</Note>
      <Note tone="info">NutriPlate n’est pas un dispositif médical et ne remplace pas un avis professionnel. Si tu ressens une perte de contrôle avec la nourriture, des compensations ou une préoccupation constante autour du poids, parle-en à un médecin ou un·e diététicien·ne. Le mode douceur est là pour ça.</Note>
    </div>
  );
}
