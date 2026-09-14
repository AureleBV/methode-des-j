import { useState } from 'react';
import type { MealSlot } from '@/domain/types';
import { SLOT_LABELS } from '@/domain/planner';
import { today } from '@/domain/weight';
import { Button, Chip, ChipRow, Sheet, Stepper } from '@/components/ui';

/** Choix du créneau + quantité avant d'ajouter au journal. */
export function AddToJournalSheet({ open, onClose, title, unit = 'portion', initialQty = 1, step = 0.5, min = 0.25, onConfirm, defaultSlot }: { open: boolean; onClose: () => void; title: string; unit?: string; initialQty?: number; step?: number; min?: number; onConfirm: (slot: MealSlot, qty: number, date: string) => Promise<void> | void; defaultSlot?: MealSlot }) {
  const [slot, setSlot] = useState<MealSlot>(defaultSlot ?? guessSlot());
  const [qty, setQty] = useState(initialQty);
  const [date, setDate] = useState(today());
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div>
          <p className="mb-1 text-sm font-semibold">Repas</p>
          <ChipRow>
            {(['breakfast', 'lunch', 'snack', 'dinner', 'other'] as MealSlot[]).map((s) => (
              <Chip key={s} active={slot === s} onClick={() => setSlot(s)}>
                {SLOT_LABELS[s]}
              </Chip>
            ))}
          </ChipRow>
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">Quantité ({unit})</p>
          <Stepper value={qty} onChange={setQty} step={step} min={min} suffix={unit} quick={unit === 'portion' ? [{ label: '½', value: 0.5 }, { label: '1', value: 1 }, { label: '1½', value: 1.5 }, { label: '2', value: 2 }] : undefined} />
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">Date</p>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5" />
        </div>
        <Button block size="lg" onClick={async () => { await onConfirm(slot, qty, date); onClose(); }}>
          Ajouter au journal
        </Button>
      </div>
    </Sheet>
  );
}

export function guessSlot(): MealSlot {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 14) return 'lunch';
  if (h < 18) return 'snack';
  if (h < 22) return 'dinner';
  return 'other';
}
