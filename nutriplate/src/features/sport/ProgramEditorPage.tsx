import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '@/db';
import { EXERCISE_LIBRARY, MUSCLE_LABELS, type ExerciseDef } from '@/db/seed/exercises';
import { WORKOUT_TYPE_LABELS } from '@/db/seed/programs';
import type { WorkoutType } from '@/domain/types';
import { saveCustomProgram } from '@/lib/actions';
import { Button, Card, Chip, ChipRow, Field, Input, NumberInput, PageHeader, Segmented, toast } from '@/components/ui';

interface Row { name: string; sets: number; reps: string }

/** Création / édition d'un programme personnel à partir de la bibliothèque d'exercices. */
export function ProgramEditorPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [type, setType] = useState<WorkoutType>('gym');
  const [emoji, setEmoji] = useState('🏋️');
  const [duration, setDuration] = useState(45);
  const [rows, setRows] = useState<Row[]>([]);
  const [muscle, setMuscle] = useState<ExerciseDef['muscle'] | 'all'>('all');
  const [q, setQ] = useState('');
  const [custom, setCustom] = useState('');

  useEffect(() => {
    if (!id) return;
    db.programs.get(id).then((p) => {
      if (!p) return;
      setName(p.name); setType(p.type); setEmoji(p.emoji); setDuration(p.durationMinutes); setRows(p.exercises.map((e) => ({ name: e.name, sets: e.sets, reps: e.reps })));
    });
  }, [id]);

  const library = useMemo(() => EXERCISE_LIBRARY.filter((e) => (muscle === 'all' || e.muscle === muscle) && (type === 'gym' || type === 'home' ? e.place.includes(type) : true) && (!q || e.name.toLowerCase().includes(q.toLowerCase()))), [muscle, type, q]);
  const add = (e: ExerciseDef | { name: string }) => setRows((s) => [...s, { name: e.name, sets: 'defaultSets' in e ? e.defaultSets : 3, reps: 'defaultReps' in e ? e.defaultReps : '8-12' }]);
  const move = (i: number, d: -1 | 1) => setRows((s) => { const n = [...s]; const j = i + d; if (j < 0 || j >= n.length) return s; [n[i], n[j]] = [n[j]!, n[i]!]; return n; });

  return (
    <div className="fade-in space-y-4">
      <PageHeader title={id ? 'Modifier le programme' : 'Nouveau programme'} back={() => nav(-1)} />
      <div className="flex gap-2">
        <Input placeholder="Nom (ex : Ma séance jambes)" value={name} onChange={(e) => setName(e.target.value)} />
        <Input value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 2))} className="!w-16 text-center" aria-label="Emoji" />
      </div>
      <Segmented value={type} onChange={setType} options={(Object.keys(WORKOUT_TYPE_LABELS) as WorkoutType[]).map((t) => ({ value: t, label: WORKOUT_TYPE_LABELS[t] }))} />
      <Field label="Durée estimée"><NumberInput value={duration} onChange={setDuration} min={5} suffix="min" /></Field>

      <Card className="space-y-2">
        <p className="text-sm font-semibold">Exercices ({rows.length})</p>
        {rows.length === 0 && <p className="text-sm text-muted">Ajoute des exercices depuis la bibliothèque ci-dessous.</p>}
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm">{r.name}</span>
            <input type="number" inputMode="numeric" value={r.sets} onChange={(e) => setRows((s) => s.map((x, k) => (k === i ? { ...x, sets: Number(e.target.value) } : x)))} className="w-12 rounded-lg border border-line bg-surface-2 px-1 py-1 text-center text-sm" aria-label="séries" />
            <span className="text-xs text-muted">×</span>
            <input value={r.reps} onChange={(e) => setRows((s) => s.map((x, k) => (k === i ? { ...x, reps: e.target.value } : x)))} className="w-16 rounded-lg border border-line bg-surface-2 px-1 py-1 text-center text-sm" aria-label="répétitions" />
            <button type="button" onClick={() => move(i, -1)} className="text-muted" aria-label="Monter">↑</button>
            <button type="button" onClick={() => move(i, 1)} className="text-muted" aria-label="Descendre">↓</button>
            <button type="button" onClick={() => setRows((s) => s.filter((_, k) => k !== i))} className="text-muted" aria-label="Retirer">✕</button>
          </div>
        ))}
      </Card>

      <Card className="space-y-2">
        <p className="text-sm font-semibold">Bibliothèque</p>
        <ChipRow>
          <Chip active={muscle === 'all'} onClick={() => setMuscle('all')}>Tous</Chip>
          {(Object.keys(MUSCLE_LABELS) as ExerciseDef['muscle'][]).map((m) => (
            <Chip key={m} active={muscle === m} onClick={() => setMuscle(m)}>{MUSCLE_LABELS[m]}</Chip>
          ))}
        </ChipRow>
        <Input placeholder="Chercher…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {library.map((e) => (
            <button key={e.name} type="button" onClick={() => add(e)} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-2">
              <span>{e.name}</span><span className="text-xs text-muted">{MUSCLE_LABELS[e.muscle]} · {e.defaultSets}×{e.defaultReps}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Exercice perso…" value={custom} onChange={(e) => setCustom(e.target.value)} />
          <Button variant="secondary" onClick={() => { if (custom.trim()) { add({ name: custom.trim() }); setCustom(''); } }}>+</Button>
        </div>
      </Card>

      <Button block size="lg" onClick={async () => { if (!name.trim() || rows.length === 0) return toast('Nom et au moins un exercice'); await saveCustomProgram({ id, name: name.trim(), type, emoji, durationMinutes: duration, exercises: rows.map((r) => ({ name: r.name, sets: Math.max(1, r.sets), reps: r.reps || '8-12' })) }); toast('Programme enregistré'); nav('/sport'); }}>
        Enregistrer
      </Button>
    </div>
  );
}
