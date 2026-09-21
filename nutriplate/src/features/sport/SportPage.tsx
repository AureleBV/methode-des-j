import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { FAMILY_LABELS, PROGRAMS, WORKOUT_TYPE_LABELS, type Program } from '@/db/seed/programs';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useCustomPrograms } from '@/lib/hooks';
import { deleteCustomProgram } from '@/lib/actions';
import { Chip, ChipRow } from '@/components/ui';
import type { WorkoutType } from '@/domain/types';
import { deleteWorkout, startWorkout } from '@/lib/actions';
import { dateLabel } from '@/lib/format';
import { addDays, today } from '@/domain/weight';
import { Button, Card, EmptyState, Note, PageHeader, SectionTitle } from '@/components/ui';

export function SportPage() {
  const nav = useNavigate();
  const workouts = useLiveQuery(() => db.workouts.orderBy('date').reverse().limit(30).toArray(), []) ?? [];
  const custom = useCustomPrograms();
  const [family, setFamily] = useState<Program['family'] | 'all' | 'mine'>('all');
  const shown = family === 'mine' ? [] : PROGRAMS.filter((p) => family === 'all' || p.family === family);
  const inProgress = workouts.find((w) => !w.completed);
  const weekAgo = addDays(today(), -7);
  const thisWeek = workouts.filter((w) => w.completed && w.date > weekAgo).length;

  async function start(programId: string | null, type: WorkoutType) {
    const id = await startWorkout(programId, type);
    nav(`/sport/${id}`);
  }

  return (
    <div className="fade-in">
      <PageHeader title="Sport" subtitle={`${thisWeek} séance${thisWeek > 1 ? 's' : ''} cette semaine`} />
      {inProgress && (
        <Card className="mb-3 flex items-center justify-between bg-primary-soft">
          <div>
            <div className="font-semibold">Séance en cours</div>
            <div className="text-sm text-muted">{inProgress.name}</div>
          </div>
          <Button size="sm" onClick={() => nav(`/sport/${inProgress.id}`)}>Reprendre</Button>
        </Card>
      )}
      <SectionTitle action={<Link to="/sport/programme/nouveau" className="text-sm font-semibold text-primary">+ Créer</Link>}>Programmes</SectionTitle>
      <ChipRow>
        <Chip active={family === 'all'} onClick={() => setFamily('all')}>Tous</Chip>
        <Chip active={family === 'mine'} onClick={() => setFamily('mine')}>Les miens ({custom.length})</Chip>
        {(Object.keys(FAMILY_LABELS) as NonNullable<Program['family']>[]).map((f) => (
          <Chip key={f} active={family === f} onClick={() => setFamily(f)}>{FAMILY_LABELS[f]}</Chip>
        ))}
      </ChipRow>
      <div className="mt-2 space-y-2">
        {(family === 'all' || family === 'mine') && custom.map((p) => (
          <Card key={p.id} className="!p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">{p.emoji} {p.name} <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px]">perso</span></div>
                <div className="text-xs text-muted">{WORKOUT_TYPE_LABELS[p.type]} · ~{p.durationMinutes} min · {p.exercises.length} exercices</div>
              </div>
              <Button size="sm" onClick={() => start(p.id, p.type)}>Démarrer</Button>
            </div>
            <div className="mt-2 flex gap-3 text-xs">
              <Link to={`/sport/programme/${p.id}`} className="font-semibold text-primary">Modifier</Link>
              <button type="button" onClick={() => { if (confirm('Supprimer ce programme ?')) deleteCustomProgram(p.id); }} className="text-muted">Supprimer</button>
            </div>
          </Card>
        ))}
        {family === 'mine' && custom.length === 0 && <EmptyState emoji="📝" title="Aucun programme perso" text="Compose ta séance à partir de la bibliothèque d’exercices." action={<Link to="/sport/programme/nouveau" className="font-semibold text-primary">Créer un programme</Link>} />}
        {shown.map((p) => (
          <Card key={p.id} className="!p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">{p.emoji} {p.name}</div>
                <div className="text-xs text-muted">{WORKOUT_TYPE_LABELS[p.type]} · {p.level} · ~{p.durationMinutes} min{p.intervals ? ' · ⏱ chrono' : ''}</div>
                <p className="mt-1 text-sm text-muted">{p.description}</p>
              </div>
              <Button size="sm" onClick={() => start(p.id, p.type)}>Démarrer</Button>
            </div>
            <ul className="mt-2 grid grid-cols-2 gap-x-3 text-xs text-muted">
              {p.exercises.map((e) => (
                <li key={e.name}>• {e.name} <span className="opacity-70">{e.sets > 1 ? `${e.sets} × ${e.reps}` : e.reps}</span></li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <SectionTitle>Séance libre</SectionTitle>
      <div className="grid grid-cols-4 gap-2">
        {(Object.keys(WORKOUT_TYPE_LABELS) as WorkoutType[]).map((t) => (
          <Button key={t} variant="secondary" size="sm" onClick={() => start(null, t)}>{WORKOUT_TYPE_LABELS[t]}</Button>
        ))}
      </div>
      <SectionTitle>Historique</SectionTitle>
      {workouts.filter((w) => w.completed).length === 0 ? (
        <EmptyState emoji="💪" title="Aucune séance encore" text="Deux à trois séances par semaine suffisent pour garder du muscle pendant la perte de poids." />
      ) : (
        <div className="space-y-2">
          {workouts.filter((w) => w.completed).map((w) => (
            <Card key={w.id} className="flex items-center justify-between !p-3" onClick={() => nav(`/sport/${w.id}`)}>
              <div>
                <div className="text-sm font-semibold">{w.name}</div>
                <div className="text-xs text-muted">{dateLabel(w.date)} · {w.durationMinutes ? `${w.durationMinutes} min` : WORKOUT_TYPE_LABELS[w.type]}{w.distanceKm ? ` · ${w.distanceKm} km` : ''}</div>
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); if (confirm('Supprimer cette séance ?')) deleteWorkout(w.id); }} className="text-muted" aria-label="Supprimer">✕</button>
            </Card>
          ))}
        </div>
      )}
      <div className="mt-4">
        <Note>Le sport sert à garder du muscle, de l’énergie et un bon moral. Il ne sert pas à “annuler” un repas : on ne compte pas les calories brûlées ici.</Note>
      </div>
    </div>
  );
}
