import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { macrosForGrams } from '@/domain/nutrition';
import type { Food, MealSlot } from '@/domain/types';
import { bestFoodMatch } from '@/domain/voiceParser';
import { logFood, logRecipe } from '@/lib/actions';
import { useFoods, useRecipeViews } from '@/lib/hooks';
import { analyzePhoto, getVisionSettings, mapGuess, type VisionGuess, type VisionProvider } from '@/services/vision';
import { Button, MacroPills, Note, Sheet, Spinner, toast } from '@/components/ui';

interface Suggestion {
  guess: VisionGuess;
  food?: Food;
  recipeId?: string;
  grams: number;
  keep: boolean;
}

/** Photo d'assiette → suggestions d'aliments/recettes à confirmer. */
export function PhotoSheet({ date, slot, onClose, onDone }: { date: string; slot: MealSlot; onClose: () => void; onDone: () => void }) {
  const foods = useFoods();
  const { byId } = useRecipeViews();
  const [preview, setPreview] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<VisionProvider>('local');
  const [sugg, setSugg] = useState<Suggestion[]>([]);
  useEffect(() => {
    getVisionSettings().then((s) => setProvider(s.provider));
  }, []);

  function onFile(file: File | undefined) {
    if (!file) return;
    setSugg([]);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        // Redimensionne (≤ 512 px) : plus rapide pour le modèle local et plus léger si envoyé à Gemini.
        const c = document.createElement('canvas');
        const s = Math.min(1, 512 / Math.max(image.width, image.height));
        c.width = Math.round(image.width * s);
        c.height = Math.round(image.height * s);
        c.getContext('2d')?.drawImage(image, 0, 0, c.width, c.height);
        const url = c.toDataURL('image/jpeg', 0.85);
        const small = new Image();
        small.onload = () => setImg(small);
        small.src = url;
        setPreview(url);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function analyse() {
    if (!img || !preview) return;
    setBusy(true);
    setError(null);
    const r = await analyzePhoto(img, preview.split(',')[1] ?? '');
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setProvider(r.provider);
    const rows: Suggestion[] = r.guesses.map((g) => {
      const m = r.provider === 'gemini' ? { foodIds: [], recipeIds: [] } : mapGuess(g.raw);
      const food = m.foodIds[0] ? foods.find((f) => f.id === m.foodIds[0]) : bestFoodMatch({ query: g.label }, foods);
      const recipeId = !food && m.recipeIds[0] ? m.recipeIds[0] : undefined;
      return { guess: g, food, recipeId, grams: g.grams ?? food?.defaultGrams ?? 150, keep: !!(food || recipeId) && g.confidence >= 0.1 };
    });
    setSugg(rows);
    if (rows.every((x) => !x.food && !x.recipeId)) setError('Rien de reconnu comme aliment. Essaie une photo plus proche, ou ajoute à la main.');
  }

  const kept = useMemo(() => sugg.filter((s) => s.keep && (s.food || s.recipeId)), [sugg]);

  return (
    <Sheet open onClose={onClose} title="Photo de l’assiette" full>
      <div className="space-y-3">
        <Note>
          {provider === 'gemini' ? 'Mode Gemini : la photo est envoyée à Google avec ta clé. ' : 'Mode local : l’analyse tourne dans ton navigateur, la photo ne quitte pas l’appareil. Reconnaissance approximative : '}
          tu confirmes et ajustes les quantités. <Link to="/profil" onClick={onClose} className="underline">Changer de mode</Link>.
        </Note>
        <label className="flex cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-line bg-surface" style={{ minHeight: 160 }}>
          {preview ? <img src={preview} alt="" className="max-h-64 w-full object-contain" /> : <span className="p-6 text-center text-sm text-muted">📷 Prendre ou choisir une photo</span>}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {preview && (
          <Button block onClick={analyse} disabled={busy}>
            {busy ? 'Analyse en cours…' : sugg.length ? 'Analyser à nouveau' : 'Analyser la photo'}
          </Button>
        )}
        {busy && <Spinner />}
        {busy && provider === 'local' && <p className="text-center text-xs text-muted">Première fois : téléchargement du modèle (~4 Mo), ensuite c’est instantané.</p>}
        {error && <p className="text-sm text-coral">{error}</p>}
        {sugg.length > 0 && (
          <div className="space-y-2">
            {sugg.map((s, i) => {
              const view = s.recipeId ? byId.get(s.recipeId) : undefined;
              return (
                <div key={i} className={`rounded-xl border border-line bg-surface p-3 ${s.keep ? '' : 'opacity-50'}`}>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={s.keep} onChange={(e) => setSugg((arr) => arr.map((x, k) => (k === i ? { ...x, keep: e.target.checked } : x)))} className="h-5 w-5 accent-[var(--primary)]" aria-label="Garder" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{s.food?.name ?? view?.recipe.name ?? s.guess.label}</div>
                      <div className="text-xs text-muted">reconnu : {s.guess.label} · confiance {Math.round(s.guess.confidence * 100)} %{!s.food && !view ? ' · pas d’équivalent dans la base' : ''}</div>
                    </div>
                    {s.food && (
                      <>
                        <input type="number" inputMode="decimal" value={s.grams} onChange={(e) => setSugg((arr) => arr.map((x, k) => (k === i ? { ...x, grams: Number(e.target.value) } : x)))} className="w-20 rounded-lg border border-line bg-surface-2 px-2 py-1 text-right text-sm" aria-label="grammes" />
                        <span className="text-xs text-muted">g</span>
                      </>
                    )}
                    {view && <span className="text-xs text-muted">1 portion</span>}
                  </div>
                  {s.food && <div className="mt-1"><MacroPills compact {...macrosForGrams(s.food.per100, s.grams)} /></div>}
                  {view && <div className="mt-1"><MacroPills compact {...view.macros} /></div>}
                </div>
              );
            })}
            <Button block size="lg" disabled={kept.length === 0} onClick={async () => { for (const s of kept) { if (s.food) await logFood({ date, slot, food: s.food, grams: s.grams }); else if (s.recipeId && byId.get(s.recipeId)) await logRecipe({ date, slot, view: byId.get(s.recipeId)!, servings: 1 }); } toast('Ajouté au journal'); onDone(); }}>
              Ajouter {kept.length} élément{kept.length > 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
