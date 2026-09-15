import { useMemo, useState } from 'react';
import { ACTIVITY_LABELS, computeTargets, GOAL_LABELS } from '@/domain/nutrition';
import type { ActivityLevel, Diet, Equipment, Goal, PreferenceLevel, Sex } from '@/domain/types';
import { saveProfile, setPreference } from '@/lib/actions';
import { Button, Card, Chip, ChipRow, Field, Note, NumberInput, Segmented, Select, Toggle } from '@/components/ui';
import { useFoods } from '@/lib/hooks';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/domain/preferences';
import { PreferencePicker } from '@/features/profile/PreferencePicker';

const EQUIPMENT: { value: Equipment; label: string; emoji: string }[] = [
  { value: 'microwave', label: 'Micro-ondes', emoji: '📡' },
  { value: 'pan', label: 'Poêle / plaques', emoji: '🍳' },
  { value: 'airfryer', label: 'Air Fryer', emoji: '🌪️' },
  { value: 'oven', label: 'Four', emoji: '🔥' },
];

export const DIET_LABELS: Record<Diet, string> = {
  none: 'Aucun régime particulier',
  vegetarian: 'Végétarien',
  vegan: 'Végan',
  pescatarian: 'Pescétarien (poisson ok)',
  no_pork: 'Sans porc',
  gluten_free: 'Sans gluten',
  lactose_free: 'Sans lactose',
};

const ED_SIGNALS = [
  'Des crises où je mange beaucoup en perdant le contrôle',
  'Je me fais parfois vomir ou je compense après avoir mangé',
  'J’ai déjà sauté des repas entiers pour “rattraper”',
  'Je pense à la nourriture ou à mon poids presque tout le temps',
];

export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [age, setAge] = useState(22);
  const [sex, setSex] = useState<Sex>('male');
  const [heightCm, setHeight] = useState(175);
  const [weightKg, setWeight] = useState(78);
  const [targetWeightKg, setTarget] = useState<number | ''>('');
  const [activity, setActivity] = useState<ActivityLevel>('light');
  const [sessions, setSessions] = useState(2);
  const [goal, setGoal] = useState<Goal>('lose');
  const [equipment, setEquipment] = useState<Equipment[]>(['microwave', 'pan']);
  const [diet, setDiet] = useState<Diet>('none');
  const [eatsBreakfast, setEatsBreakfast] = useState(true);
  const [signals, setSignals] = useState<boolean[]>(ED_SIGNALS.map(() => false));
  const [prefs, setPrefs] = useState<Record<string, PreferenceLevel>>({});
  const [tagPrefs, setTagPrefs] = useState<Record<string, PreferenceLevel>>({});
  const foods = useFoods();

  const gentleMode = signals.some(Boolean);
  const targets = useMemo(() => computeTargets({ sex, age, heightCm, weightKg, activity, sessionsPerWeek: sessions, goal, gentleMode }), [sex, age, heightCm, weightKg, activity, sessions, goal, gentleMode]);

  const steps = ['Toi', 'Objectif', 'Cuisine', 'Goûts', 'Résumé'];

  async function finish() {
    await saveProfile({ firstName: firstName.trim() || undefined, age, sex, heightCm, weightKg, targetWeightKg: targetWeightKg === '' ? undefined : targetWeightKg, activity, sessionsPerWeek: sessions, goal, equipment: equipment.length ? equipment : ['none'], diet, eatsBreakfast, kcalAdjustment: 0, gentleMode, waterGoalMl: 1500, onboarded: true });
    for (const [foodId, level] of Object.entries(prefs)) await setPreference('food', foodId, level);
    for (const [tag, level] of Object.entries(tagPrefs)) await setPreference('tag', tag, level);
  }

  const toggleEquip = (e: Equipment) => setEquipment((s) => (s.includes(e) ? s.filter((x) => x !== e) : [...s, e]));

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-6">
      <div className="mb-5 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-line'}`} />
        ))}
      </div>

      {step === 0 && (
        <div className="fade-in space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bienvenue 👋</h1>
            <p className="mt-1 text-muted">Manger ce que tu aimes, à ta faim, en perdant du poids tranquillement. Quelques infos pour calibrer.</p>
          </div>
          <Field label="Prénom (facultatif)">
            <input className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-primary" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Comment on t’appelle ?" />
          </Field>
          <Field label="Sexe (pour la formule de calcul)">
            <Segmented value={sex} onChange={setSex} options={[{ value: 'male', label: 'Homme' }, { value: 'female', label: 'Femme' }]} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Âge">
              <NumberInput value={age} onChange={setAge} min={14} max={100} suffix="ans" />
            </Field>
            <Field label="Taille">
              <NumberInput value={heightCm} onChange={setHeight} min={120} max={230} suffix="cm" />
            </Field>
            <Field label="Poids">
              <NumberInput value={weightKg} onChange={setWeight} min={30} max={300} step={0.1} suffix="kg" />
            </Field>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="fade-in space-y-4">
          <h1 className="text-2xl font-bold tracking-tight">Ton objectif</h1>
          <Field label="Objectif">
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
                <button key={g} type="button" onClick={() => setGoal(g)} className={`rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition ${goal === g ? 'border-primary bg-primary-soft' : 'border-line bg-surface'}`}>
                  {GOAL_LABELS[g]}
                </button>
              ))}
            </div>
          </Field>
          {goal !== 'maintain' && (
            <Field label="Poids visé (facultatif)" hint="Juste un repère, pas une date limite.">
              <NumberInput value={targetWeightKg === '' ? 0 : targetWeightKg} onChange={(v) => setTarget(v === 0 ? '' : v)} min={0} max={300} step={0.5} suffix="kg" placeholder="—" />
            </Field>
          )}
          <Field label="Activité quotidienne (hors sport)">
            <Select value={activity} onChange={(e) => setActivity(e.target.value as ActivityLevel)}>
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
                <option key={a} value={a}>
                  {ACTIVITY_LABELS[a]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Séances de sport par semaine">
            <ChipRow>
              {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                <Chip key={n} active={sessions === n} onClick={() => setSessions(n)}>
                  {n === 6 ? '6+' : n}
                </Chip>
              ))}
            </ChipRow>
          </Field>
          <Card className="space-y-2">
            <p className="text-sm font-semibold">Ces derniers temps, est-ce que tu te reconnais là-dedans ?</p>
            <p className="text-xs text-muted">Réponse facultative. Ça sert uniquement à adapter l’app (pas de déficit poussé, pas de pression).</p>
            {ED_SIGNALS.map((s, i) => (
              <Toggle key={s} label={<span className="text-sm">{s}</span>} checked={signals[i] ?? false} onChange={(v) => setSignals((arr) => arr.map((x, j) => (j === i ? v : x)))} />
            ))}
            {gentleMode && (
              <Note tone="warm">
                Merci de l’avoir dit. Ce que tu décris mérite mieux qu’une appli : en parler à un médecin ou un·e diététicien·ne peut vraiment aider. Ici, on reste en mode douceur : objectif proche du maintien, aucun message de restriction.
              </Note>
            )}
          </Card>
        </div>
      )}

      {step === 2 && (
        <div className="fade-in space-y-4">
          <h1 className="text-2xl font-bold tracking-tight">Ta cuisine</h1>
          <p className="text-muted">On ne te proposera que des recettes faisables avec ce que tu as.</p>
          <div className="grid grid-cols-2 gap-2">
            {EQUIPMENT.map((e) => (
              <button key={e.value} type="button" onClick={() => toggleEquip(e.value)} className={`rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition ${equipment.includes(e.value) ? 'border-primary bg-primary-soft' : 'border-line bg-surface'}`}>
                <span className="mr-2">{e.emoji}</span>
                {e.label}
              </button>
            ))}
          </div>
          <Field label="Régime particulier">
            <Select value={diet} onChange={(e) => setDiet(e.target.value as Diet)}>
              {(Object.keys(DIET_LABELS) as Diet[]).map((d) => (
                <option key={d} value={d}>
                  {DIET_LABELS[d]}
                </option>
              ))}
            </Select>
          </Field>
          <Card>
            <Toggle label="Je prends un petit-déjeuner en général" checked={eatsBreakfast} onChange={setEatsBreakfast} />
          </Card>
        </div>
      )}

      {step === 3 && (
        <div className="fade-in space-y-4">
          <h1 className="text-2xl font-bold tracking-tight">Tes goûts</h1>
          <p className="text-muted">Un aliment marqué “je déteste” ne sera quasiment jamais proposé. Tu pourras affiner plus tard dans Profil.</p>
          <PreferencePicker foods={foods} prefs={prefs} tagPrefs={tagPrefs} onFood={(id, l) => setPrefs((p) => ({ ...p, [id]: l }))} onTag={(t, l) => setTagPrefs((p) => ({ ...p, [t]: l }))} categories={CATEGORY_ORDER.filter((c) => !['fat', 'drink', 'other'].includes(c))} labels={CATEGORY_LABELS} />
        </div>
      )}

      {step === 4 && (
        <div className="fade-in space-y-4">
          <h1 className="text-2xl font-bold tracking-tight">Ton point de départ</h1>
          <Card className="space-y-3">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">{targets.kcal} kcal</div>
              <div className="text-sm text-muted">par jour, en moyenne</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-primary-soft py-2">
                <div className="font-bold">{targets.protein} g</div>
                <div className="text-xs text-muted">protéines</div>
              </div>
              <div className="rounded-xl bg-accent-soft py-2">
                <div className="font-bold">{targets.carbs} g</div>
                <div className="text-xs text-muted">glucides</div>
              </div>
              <div className="rounded-xl bg-coral-soft py-2">
                <div className="font-bold">{targets.fat} g</div>
                <div className="text-xs text-muted">lipides</div>
              </div>
            </div>
            <p className="text-sm text-muted">
              Métabolisme de base estimé ≈ {targets.bmr} kcal, dépense totale ≈ {targets.tdee} kcal. {targets.delta < 0 ? `Déficit modéré de ${Math.abs(targets.delta)} kcal : assez pour progresser, pas assez pour avoir faim tout le temps.` : targets.delta > 0 ? `Léger surplus de ${targets.delta} kcal.` : 'Objectif au niveau de ta dépense.'}
            </p>
          </Card>
          <Note>Ce sont des estimations basées sur des formules standard (Mifflin-St Jeor), pas une vérité médicale. L’app te proposera un ajustement après quelques semaines selon l’évolution réelle de ton poids moyen.</Note>
          <Note tone="info">NutriPlate n’est pas un dispositif médical. En cas de pathologie, de grossesse ou de doute, parle-en à un professionnel de santé.</Note>
        </div>
      )}

      <div className="mt-auto flex gap-3 pt-6">
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
            Retour
          </Button>
        )}
        {step < steps.length - 1 ? (
          <Button block size="lg" onClick={() => setStep((s) => s + 1)}>
            Continuer
          </Button>
        ) : (
          <Button block size="lg" onClick={finish}>
            C’est parti
          </Button>
        )}
      </div>
    </div>
  );
}
