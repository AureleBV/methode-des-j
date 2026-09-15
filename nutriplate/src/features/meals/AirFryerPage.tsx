import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AIRFRYER_PRESETS, OIL_NOTE } from '@/db/seed/airfryer';
import { macrosForGrams } from '@/domain/nutrition';
import { logCustom } from '@/lib/actions';
import { useFoodMap, useRecipeViews } from '@/lib/hooks';
import { Button, Card, MacroPills, Note, PageHeader, SectionTitle, Stepper, toast } from '@/components/ui';
import { AddToJournalSheet } from '@/features/journal/AddToJournalSheet';
import { RecipeCard } from './RecipeCard';

export function AirFryerPage() {
  const nav = useNavigate();
  const foodMap = useFoodMap();
  const { views } = useRecipeViews();
  const [presetId, setPresetId] = useState(AIRFRYER_PRESETS[0]!.id);
  const preset = AIRFRYER_PRESETS.find((p) => p.id === presetId)!;
  const [grams, setGrams] = useState(preset.defaultGrams);
  const [oil, setOil] = useState(preset.oilGramsDefault);
  const [temp, setTemp] = useState(preset.tempC);
  const [minutes, setMinutes] = useState(preset.minutes[0]);
  const [adding, setAdding] = useState(false);

  const select = (id: string) => {
    const p = AIRFRYER_PRESETS.find((x) => x.id === id)!;
    setPresetId(id);
    setGrams(p.defaultGrams);
    setOil(p.oilGramsDefault);
    setTemp(p.tempC);
    setMinutes(p.minutes[0]);
  };

  const food = foodMap.get(preset.foodId);
  const macros = useMemo(() => {
    if (!food) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    const m = macrosForGrams(food.per100, grams);
    return { ...m, kcal: m.kcal + oil * 9, fat: Math.round((m.fat + oil) * 10) / 10 };
  }, [food, grams, oil]);
  const airRecipes = views.filter((v) => v.recipe.tags.includes('airfryer'));

  return (
    <div className="fade-in">
      <PageHeader title="Mode Air Fryer" subtitle="Croustillant, avec 5 à 10 fois moins d’huile qu’une friture." back={() => nav(-1)} />
      <div className="grid grid-cols-3 gap-2">
        {AIRFRYER_PRESETS.map((p) => (
          <button key={p.id} type="button" onClick={() => select(p.id)} className={`rounded-2xl border px-2 py-2.5 text-center text-xs font-semibold transition ${p.id === presetId ? 'border-primary bg-primary-soft' : 'border-line bg-surface'}`}>
            <div className="text-xl">{p.emoji}</div>
            {p.name}
          </button>
        ))}
      </div>

      <Card className="mt-4 space-y-4">
        <div>
          <p className="mb-1 text-sm font-semibold">Quantité</p>
          <Stepper value={grams} onChange={setGrams} step={50} min={0} suffix="g" />
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">Huile</p>
          <Stepper value={oil} onChange={setOil} step={1} min={0} suffix="g" quick={[{ label: '0', value: 0 }, { label: '5 g', value: 5 }, { label: '10 g', value: 10 }, { label: '15 g', value: 15 }, { label: '30 g', value: 30 }]} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1 text-sm font-semibold">Température</p>
            <Stepper value={temp} onChange={setTemp} step={10} min={80} suffix="°C" />
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold">Temps</p>
            <Stepper value={minutes} onChange={setMinutes} step={1} min={1} suffix="min" />
          </div>
        </div>
        <p className="text-xs text-muted">Conseil : {preset.tempC} °C, {preset.minutes[0]}-{preset.minutes[1]} min. {preset.notes}</p>
        <div className="rounded-xl bg-surface-2 p-3">
          <MacroPills {...macros} />
          <p className="mt-1 text-xs text-muted">
            dont {oil * 9} kcal d’huile · {food?.name}
          </p>
        </div>
        <Button block onClick={() => setAdding(true)}>
          Ajouter au journal
        </Button>
      </Card>
      <div className="mt-3">
        <Note tone="warm">{OIL_NOTE}</Note>
      </div>

      <SectionTitle>Recettes Air Fryer</SectionTitle>
      <div className="space-y-2">
        {airRecipes.map((v) => (
          <RecipeCard key={v.recipe.id} view={v} compact />
        ))}
      </div>

      {adding && (
        <AddToJournalSheet
          open
          onClose={() => setAdding(false)}
          title={`${preset.name} Air Fryer`}
          unit="portion"
          onConfirm={async (slot, qty, date) => {
            await logCustom({ date, slot, name: `${preset.name} Air Fryer (${grams} g, ${oil} g d’huile)`, grams: Math.round((grams + oil) * qty), macros: { kcal: Math.round(macros.kcal * qty), protein: Math.round(macros.protein * qty * 10) / 10, carbs: Math.round(macros.carbs * qty * 10) / 10, fat: Math.round(macros.fat * qty * 10) / 10 } });
            toast('Ajouté au journal');
          }}
        />
      )}
    </div>
  );
}
