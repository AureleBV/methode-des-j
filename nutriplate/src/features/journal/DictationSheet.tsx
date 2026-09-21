import { useEffect, useMemo, useRef, useState } from 'react';
import { macrosForGrams } from '@/domain/nutrition';
import type { Food, MealSlot } from '@/domain/types';
import { bestFoodMatch, gramsFor, parseSpokenMeal, type SpokenItem } from '@/domain/voiceParser';
import { logFood } from '@/lib/actions';
import { useFoods, useProfile } from '@/lib/hooks';
import { usualVariant } from '@/domain/variants';
import { dictate, DICTATION_ERRORS, isDictationSupported } from '@/services/speech';
import { Button, Input, MacroPills, Note, Sheet, toast } from '@/components/ui';

interface Row {
  item: SpokenItem;
  food?: Food;
  grams: number;
}

/** Dicter un repas : "150 g de poulet, 200 g de riz et une banane". */
export function DictationSheet({ date, slot, onClose, onDone }: { date: string; slot: MealSlot; onClose: () => void; onDone: () => void }) {
  const foods = useFoods();
  const profile = useProfile();
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [picking, setPicking] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const stopRef = useRef<() => void>(() => undefined);
  const supported = isDictationSupported();

  const analyse = (sentence: string) => {
    const items = parseSpokenMeal(sentence);
    setRows(items.map((item) => { const best = bestFoodMatch(item, foods); const food = best ? usualVariant(best, foods, profile) : undefined; return { item, food, grams: food ? gramsFor(item, food) : item.grams ?? 100 }; }));
  };

  async function listen() {
    setError(null);
    setListening(true);
    const h = dictate();
    stopRef.current = h.stop;
    try {
      const heard = await h.result;
      setText(heard);
      analyse(heard);
    } catch (e) {
      setError(DICTATION_ERRORS[(e as Error).message] ?? 'Dictée impossible pour l’instant.');
    } finally {
      setListening(false);
    }
  }

  useEffect(() => () => stopRef.current(), []);
  const candidates = useMemo(() => (q.trim().length >= 2 ? foods.filter((f) => f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8) : []), [q, foods]);
  const total = rows.reduce((s, r) => s + (r.food ? macrosForGrams(r.food.per100, r.grams).kcal : 0), 0);

  return (
    <Sheet open onClose={onClose} title="Dicter un repas">
      <div className="space-y-3">
        <Note>Dis par exemple : « 150 g de poulet, 200 g de riz et une banane ». Rien n’est stocké ailleurs que sur ton appareil ; la reconnaissance vocale est celle du navigateur.</Note>
        <div className="flex gap-2">
          <Button block size="lg" variant={listening ? 'danger' : 'primary'} onClick={listening ? () => stopRef.current() : listen} disabled={!supported}>
            {listening ? '⏹ J’écoute… (toucher pour arrêter)' : '🎤 Parler'}
          </Button>
        </div>
        {!supported && <p className="text-sm text-muted">La dictée n’est pas disponible ici. Tu peux quand même taper la phrase ci-dessous.</p>}
        {error && <p className="text-sm text-coral">{error}</p>}
        <div className="flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="…ou écris la phrase" />
          <Button variant="secondary" onClick={() => analyse(text)}>OK</Button>
        </div>
        {rows.length > 0 && (
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="rounded-xl border border-line bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <button type="button" onClick={() => { setPicking(i); setQ(r.item.query); }} className="min-w-0 flex-1 text-left">
                    <div className="truncate text-sm font-semibold">{r.food ? r.food.name : `« ${r.item.query} » — introuvable, touche pour choisir`}</div>
                    <div className="text-xs text-muted">dicté : {r.item.query}{r.item.count ? ` × ${r.item.count}` : ''}</div>
                  </button>
                  <input type="number" inputMode="decimal" value={r.grams} onChange={(e) => setRows((s) => s.map((x, k) => (k === i ? { ...x, grams: Number(e.target.value) } : x)))} className="w-20 rounded-lg border border-line bg-surface-2 px-2 py-1 text-right text-sm" aria-label="grammes" />
                  <span className="text-xs text-muted">g</span>
                  <button type="button" onClick={() => setRows((s) => s.filter((_, k) => k !== i))} className="text-muted" aria-label="Retirer">✕</button>
                </div>
                {r.food && <div className="mt-1"><MacroPills compact {...macrosForGrams(r.food.per100, r.grams)} /></div>}
                {picking === i && (
                  <div className="mt-2 space-y-1">
                    <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher l’aliment…" />
                    {candidates.map((f) => (
                      <button key={f.id} type="button" onClick={() => { setRows((s) => s.map((x, k) => (k === i ? { ...x, food: f, grams: gramsFor(x.item, f) } : x))); setPicking(null); }} className="flex w-full justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-2">
                        <span>{f.name}</span><span className="text-xs text-muted">{f.per100.kcal} kcal/100 g</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Button block size="lg" disabled={!rows.some((r) => r.food)} onClick={async () => { for (const r of rows) if (r.food && r.grams > 0) await logFood({ date, slot, food: r.food, grams: r.grams }); toast('Repas ajouté'); onDone(); }}>
              Ajouter {rows.filter((r) => r.food).length} aliment{rows.filter((r) => r.food).length > 1 ? 's' : ''} · {Math.round(total)} kcal
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
