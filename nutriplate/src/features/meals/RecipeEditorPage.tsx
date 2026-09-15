import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '@/db';
import { macrosForGrams, sumMacros } from '@/domain/nutrition';
import type { Equipment, Food } from '@/domain/types';
import { saveCustomRecipe } from '@/lib/actions';
import { useFoods } from '@/lib/hooks';
import { Button, Card, Chip, ChipRow, Field, Input, MacroPills, NumberInput, PageHeader, toast } from '@/components/ui';
import { EQUIPMENT_LABELS } from './RecipeCard';

const EMOJIS = ['🍽️', '🍝', '🍚', '🍗', '🥩', '🍔', '🌯', '🍕', '🥗', '🍳', '🥣', '🍲', '🐟', '🥪', '🍫'];
const TAGS = ['plat', 'petit-dej', 'collation', 'dessert', 'rapide', 'etudiant', 'grosse-faim', 'proteine', 'airfryer', 'micro-ondes', 'vegetarien', 'sans-cuisson'];

export function RecipeEditorPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const foods = useFoods();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🍽️');
  const [description, setDescription] = useState('');
  const [prep, setPrep] = useState(15);
  const [servings, setServings] = useState(1);
  const [equipment, setEquipment] = useState<Equipment[]>(['pan']);
  const [tags, setTags] = useState<string[]>(['plat']);
  const [steps, setSteps] = useState('');
  const [items, setItems] = useState<{ foodId: string; grams: number }[]>([]);
  const [q, setQ] = useState('');
  const [image, setImage] = useState<string | undefined>();

  useEffect(() => {
    if (!id) return;
    (async () => {
      const r = await db.recipes.get(id);
      if (!r) return;
      setName(r.name); setEmoji(r.emoji); setDescription(r.description ?? ''); setPrep(r.prepMinutes); setServings(r.servings); setEquipment(r.equipment); setTags(r.tags); setSteps(r.instructions.join('\n')); setImage(r.imageDataUrl);
      const ings = await db.recipeIngredients.where('recipeId').equals(id).toArray();
      setItems(ings.map((i) => ({ foodId: i.foodId, grams: i.grams })));
    })();
  }, [id]);

  const foodMap = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);
  const results = q.trim().length >= 2 ? foods.filter((f) => f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  const total = sumMacros(items.map((i) => (foodMap.get(i.foodId) ? macrosForGrams(foodMap.get(i.foodId)!.per100, i.grams) : { kcal: 0, protein: 0, carbs: 0, fat: 0 })));
  const perServing = { kcal: Math.round(total.kcal / servings), protein: total.protein / servings, carbs: total.carbs / servings, fat: total.fat / servings };

  const addFood = (f: Food) => { setItems((s) => [...s, { foodId: f.id, grams: f.defaultGrams ?? 100 }]); setQ(''); };
  const onImage = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        const s = 320 / Math.max(img.width, img.height);
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
        setImage(c.toDataURL('image/jpeg', 0.8));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  async function save() {
    if (!name.trim() || items.length === 0) return toast('Nom et au moins un ingrédient requis');
    const rid = await saveCustomRecipe({ id, name: name.trim(), emoji, description: description.trim() || undefined, tags, prepMinutes: prep, difficulty: prep <= 15 ? 'easy' : 'medium', equipment: equipment.length ? equipment : ['none'], servings, instructions: steps.split('\n').map((s) => s.trim()).filter(Boolean), imageDataUrl: image }, items);
    toast('Recette enregistrée');
    nav(`/repas/${rid}`, { replace: true });
  }

  return (
    <div className="fade-in space-y-4">
      <PageHeader title={id ? 'Modifier la recette' : 'Nouvelle recette'} back={() => nav(-1)} />
      <div className="flex items-center gap-3">
        <label className="flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-surface-2 text-3xl">
          {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : '📷'}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => onImage(e.target.files?.[0])} />
        </label>
        <div className="flex-1 space-y-2">
          <Input placeholder="Nom de la recette" value={name} onChange={(e) => setName(e.target.value)} />
          <ChipRow>
            {EMOJIS.map((e) => (
              <Chip key={e} active={emoji === e} onClick={() => setEmoji(e)}>
                {e}
              </Chip>
            ))}
          </ChipRow>
        </div>
      </div>
      <Field label="Description (facultatif)">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Temps">
          <NumberInput value={prep} onChange={setPrep} min={1} suffix="min" />
        </Field>
        <Field label="Portions">
          <NumberInput value={servings} onChange={setServings} min={1} suffix="pers." />
        </Field>
      </div>
      <Field label="Matériel">
        <ChipRow>
          {(['none', 'microwave', 'pan', 'airfryer', 'oven'] as Equipment[]).map((e) => (
            <Chip key={e} active={equipment.includes(e)} onClick={() => setEquipment((s) => (s.includes(e) ? s.filter((x) => x !== e) : [...s.filter((x) => x !== 'none'), e]))}>
              {EQUIPMENT_LABELS[e]}
            </Chip>
          ))}
        </ChipRow>
      </Field>
      <Field label="Tags">
        <ChipRow>
          {TAGS.map((t) => (
            <Chip key={t} active={tags.includes(t)} onClick={() => setTags((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))}>
              {t}
            </Chip>
          ))}
        </ChipRow>
      </Field>

      <Card className="space-y-2">
        <p className="text-sm font-semibold">Ingrédients</p>
        {items.map((i, n) => {
          const f = foodMap.get(i.foodId);
          return (
            <div key={n} className="flex items-center gap-2">
              <span className="flex-1 truncate text-sm">{f?.name ?? i.foodId}</span>
              <input type="number" inputMode="decimal" value={i.grams} onChange={(e) => setItems((s) => s.map((x, k) => (k === n ? { ...x, grams: Number(e.target.value) } : x)))} className="w-20 rounded-lg border border-line bg-surface-2 px-2 py-1 text-right text-sm" aria-label="grammes" />
              <button type="button" onClick={() => setItems((s) => s.filter((_, k) => k !== n))} className="text-muted" aria-label="Retirer">
                ✕
              </button>
            </div>
          );
        })}
        <Input placeholder="Ajouter un aliment…" value={q} onChange={(e) => setQ(e.target.value)} />
        {results.map((f) => (
          <button key={f.id} type="button" onClick={() => addFood(f)} className="flex w-full justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-2">
            <span>{f.name}</span>
            <span className="text-xs text-muted">{f.per100.kcal} kcal/100 g</span>
          </button>
        ))}
        <div className="pt-1">
          <MacroPills {...perServing} />
          <span className="text-xs text-muted">par portion</span>
        </div>
      </Card>
      <Field label="Étapes (une par ligne)">
        <textarea value={steps} onChange={(e) => setSteps(e.target.value)} rows={4} className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-primary" />
      </Field>
      <Button block size="lg" onClick={save}>
        Enregistrer
      </Button>
    </div>
  );
}
