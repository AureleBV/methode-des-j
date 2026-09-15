import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import type { WorkoutExercise, WorkoutSet } from '@/domain/types';
import { finishWorkout, updateExercise } from '@/lib/actions';
import { Button, Card, Field, NumberInput, PageHeader, toast } from '@/components/ui';
import { dateLabel } from '@/lib/format';

export function WorkoutPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const workout = useLiveQuery(() => (id ? db.workouts.get(id) : undefined), [id]);
  const exercises = useLiveQuery(async () => (id ? db.workoutExercises.where('workoutId').equals(id).sortBy('order') : ([] as WorkoutExercise[])), [id]) ?? [];
  const previous = useLiveQuery(async () => {
    if (!workout?.programId) return [] as WorkoutExercise[];
    const last = await db.workouts.where('date').below(workout.date).filter((w) => w.programId === workout.programId && w.completed).last();
    return last ? db.workoutExercises.where('workoutId').equals(last.id).toArray() : [];
  }, [workout?.programId, workout?.date]) ?? [];
  const [duration, setDuration] = useState(workout?.durationMinutes ?? 30);
  const [distance, setDistance] = useState(workout?.distanceKm ?? 0);
  const [notes, setNotes] = useState(workout?.notes ?? '');

  if (!workout) return null;
  const readOnly = workout.completed;

  return (
    <div className="fade-in">
      <PageHeader title={workout.name} subtitle={dateLabel(workout.date)} back={() => nav('/sport')} />
      <div className="space-y-3">
        {exercises.map((ex) => (
          <ExerciseCard key={ex.id} ex={ex} prev={previous.find((p) => p.name === ex.name)} readOnly={readOnly} />
        ))}
        {(workout.type === 'walk' || workout.type === 'cardio' || exercises.length === 0) && (
          <Card className="grid grid-cols-2 gap-3">
            <Field label="Durée">
              <NumberInput value={duration} onChange={setDuration} suffix="min" disabled={readOnly} />
            </Field>
            <Field label="Distance">
              <NumberInput value={distance} onChange={setDistance} step={0.1} suffix="km" disabled={readOnly} />
            </Field>
          </Card>
        )}
        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={readOnly} rows={2} className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5" placeholder="Forme du jour, ressenti…" />
        </Field>
        {!readOnly && (
          <Button block size="lg" onClick={async () => { await finishWorkout(workout.id, { durationMinutes: duration || undefined, distanceKm: distance || undefined, notes: notes || undefined }); toast('Séance enregistrée 💪'); nav('/sport'); }}>
            Terminer la séance
          </Button>
        )}
      </div>
    </div>
  );
}

function ExerciseCard({ ex, prev, readOnly }: { ex: WorkoutExercise; prev?: WorkoutExercise; readOnly: boolean }) {
  const update = (i: number, patch: Partial<WorkoutSet>) => updateExercise(ex.id, ex.sets.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const prevBest = prev ? Math.max(...prev.sets.map((s) => s.weightKg ?? 0)) : 0;
  const best = Math.max(...ex.sets.map((s) => s.weightKg ?? 0));
  return (
    <Card className="!p-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold">{ex.name}</h3>
        <span className="text-xs text-muted">{ex.targetSets} × {ex.targetReps}</span>
      </div>
      {prev && <p className="text-xs text-muted">Dernière fois : {prev.sets.map((s) => `${s.reps}${s.weightKg ? `×${s.weightKg}kg` : ''}`).join(' · ')}{best > prevBest ? ' · 📈 progression !' : ''}</p>}
      <div className="mt-2 space-y-1.5">
        {ex.sets.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 text-xs text-muted">S{i + 1}</span>
            <input type="number" inputMode="numeric" value={s.reps} disabled={readOnly} onChange={(e) => update(i, { reps: Number(e.target.value) })} className="w-16 rounded-lg border border-line bg-surface-2 px-2 py-1 text-center text-sm" aria-label="répétitions" />
            <span className="text-xs text-muted">reps</span>
            <input type="number" inputMode="decimal" step={0.5} value={s.weightKg ?? ''} placeholder="—" disabled={readOnly} onChange={(e) => update(i, { weightKg: e.target.value === '' ? undefined : Number(e.target.value) })} className="w-20 rounded-lg border border-line bg-surface-2 px-2 py-1 text-center text-sm" aria-label="poids" />
            <span className="text-xs text-muted">kg</span>
            <button type="button" disabled={readOnly} onClick={() => update(i, { done: !s.done })} className={`ml-auto h-8 w-8 rounded-full text-sm ${s.done ? 'bg-primary text-white' : 'bg-surface-2'}`} aria-label="Série faite">✓</button>
          </div>
        ))}
      </div>
      {!readOnly && (
        <Button size="sm" variant="ghost" className="mt-1" onClick={() => updateExercise(ex.id, [...ex.sets, { reps: ex.sets.at(-1)?.reps ?? 10, weightKg: ex.sets.at(-1)?.weightKg, done: false }])}>
          + série
        </Button>
      )}
    </Card>
  );
}
