import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { suggestAdjustment } from '@/domain/nutrition';
import { addDays, detectPlateau, movingAverage, today, WEIGHT_VARIATION_NOTE, weightSummary } from '@/domain/weight';
import { deleteWeight, logWeight, updateProfile } from '@/lib/actions';
import { dateLabel } from '@/lib/format';
import { useProfile, useTargets, useWeightLogs } from '@/lib/hooks';
import { Button, Card, EmptyState, Note, NumberInput, PageHeader, SectionTitle, toast } from '@/components/ui';

export function ProgressPage() {
  const profile = useProfile();
  const targets = useTargets(profile);
  const logs = useWeightLogs();
  const [kg, setKg] = useState(profile?.weightKg ?? 70);
  const [date, setDate] = useState(today());
  const summary = useMemo(() => weightSummary(logs), [logs]);
  const plateau = useMemo(() => detectPlateau(logs), [logs]);
  const series = useMemo(() => movingAverage(logs).filter((p) => p.date >= addDays(today(), -90)), [logs]);
  const mealDays = useLiveQuery(async () => { const since = addDays(today(), -14); const l = await db.mealLogs.where('date').aboveOrEqual(since).toArray(); return new Set(l.map((x) => x.date)).size; }, []) ?? 0;
  const hungerHigh = useLiveQuery(async () => { const since = addDays(today(), -14); const d = await db.dayLogs.where('date').aboveOrEqual(since).toArray(); const h = d.filter((x) => x.hunger).map((x) => x.hunger!); return h.length >= 3 && h.reduce((a, b) => a + b, 0) / h.length >= 4; }, []) ?? false;

  const advice = useMemo(() => {
    if (!profile || summary.weeklyTrend === null) return null;
    const first = logs[0]?.date;
    const weeks = first ? Math.floor((Date.parse(today()) - Date.parse(first)) / (7 * 86400000)) : 0;
    return suggestAdjustment({ goal: profile.goal, weeklyChangeKg: summary.weeklyTrend, weightKg: profile.weightKg, weeksObserved: weeks, adherenceOk: mealDays >= 8, hungerHigh, gentleMode: profile.gentleMode });
  }, [profile, summary.weeklyTrend, logs, mealDays, hungerHigh]);

  if (!profile) return null;

  return (
    <div className="fade-in">
      <PageHeader title="Progrès" subtitle="La tendance compte, pas le chiffre du jour." />
      <Card className="space-y-3">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <p className="mb-1 text-sm font-semibold">Poids du jour</p>
            <NumberInput value={kg} onChange={setKg} step={0.1} min={30} max={300} suffix="kg" />
          </div>
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} className="rounded-xl border border-line bg-surface px-3 py-2.5" aria-label="Date" />
          <Button onClick={async () => { await logWeight(date, kg); toast('Poids enregistré'); }}>OK</Button>
        </div>
        <p className="text-xs text-muted">Idéalement le matin, à jeun, après être passé aux toilettes. Une pesée manquée n’a aucune importance.</p>
      </Card>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat label="Dernier poids" value={summary.latest ? `${summary.latest.kg} kg` : '—'} sub={summary.latest ? dateLabel(summary.latest.date) : ''} />
        <Stat label="Moyenne 7 jours" value={summary.avg7 !== null ? `${summary.avg7} kg` : '—'} sub="la vraie référence" />
        <Stat label="Sur 30 jours" value={fmtDelta(summary.change30)} sub="moyennes comparées" />
        <Stat label="Depuis le début" value={fmtDelta(summary.changeSinceStart)} sub={profile.targetWeightKg && summary.latest ? `objectif ${profile.targetWeightKg} kg` : ''} />
      </div>

      {series.length >= 2 ? (
        <Card className="mt-3 !p-3">
          <WeightChart data={series} target={profile.targetWeightKg} />
          <div className="mt-1 flex gap-4 text-[11px] text-muted">
            <span><span className="inline-block h-2 w-2 rounded-full bg-line align-middle" /> pesées</span>
            <span><span className="inline-block h-2 w-4 rounded-full bg-primary align-middle" /> moyenne 7 j</span>
          </div>
        </Card>
      ) : (
        <div className="mt-3">
          <EmptyState emoji="📈" title="Le graphique arrive" text="À partir de deux pesées, la courbe et la moyenne mobile s’affichent ici." />
        </div>
      )}
      <div className="mt-3">
        <Note>{WEIGHT_VARIATION_NOTE}</Note>
      </div>

      {plateau.plateau && (
        <Card className="mt-3 space-y-2 bg-accent-soft">
          <p className="font-semibold">Ton poids semble stable depuis {plateau.weeks} semaines.</p>
          <p className="text-sm">Aucune panique : les plateaux font partie du processus. Avant de toucher aux calories, vérifie dans l’ordre :</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>Les portions (huile, fromage, sauces se glissent facilement).</li>
            <li>Les boissons et grignotages non notés.</li>
            <li>L’activité quotidienne (marche, pas).</li>
            <li>Le sommeil et le stress.</li>
            <li>Seulement ensuite : ajuster légèrement (-100 kcal), jamais plus.</li>
          </ol>
        </Card>
      )}

      {advice && targets && (
        <>
          <SectionTitle>Ajustement proposé</SectionTitle>
          <Card className="space-y-2">
            <p className="text-sm">{advice.reason}</p>
            {advice.deltaKcal !== 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{targets.kcal} → {targets.kcal + advice.deltaKcal} kcal / jour</span>
                <Button size="sm" onClick={async () => { await updateProfile({ kcalAdjustment: profile.kcalAdjustment + advice.deltaKcal }); toast('Objectif ajusté'); }}>Appliquer</Button>
              </div>
            )}
            <p className="text-xs text-muted">Basé sur la tendance des moyennes 7 j des 3 dernières semaines, le remplissage du journal et la faim signalée.</p>
          </Card>
        </>
      )}

      {logs.length > 0 && (
        <>
          <SectionTitle>Historique</SectionTitle>
          <Card className="!p-0">
            <ul className="divide-y divide-line">
              {[...logs].reverse().slice(0, 30).map((l) => (
                <li key={l.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-muted">{dateLabel(l.date)}</span>
                  <span className="font-semibold">{l.kg} kg</span>
                  <button type="button" onClick={() => deleteWeight(l.id)} className="text-muted" aria-label="Supprimer">✕</button>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

function fmtDelta(v: number | null): string {
  if (v === null) return '—';
  return `${v > 0 ? '+' : ''}${v} kg`;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="text-xl font-bold">{value}</div>
      {sub && <div className="text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

function WeightChart({ data, target }: { data: { date: string; kg: number; avg: number }[]; target?: number }) {
  const W = 320, H = 150, P = 24;
  const values = data.flatMap((d) => [d.kg, d.avg]).concat(target ? [target] : []);
  const min = Math.floor(Math.min(...values) - 0.5), max = Math.ceil(Math.max(...values) + 0.5);
  const t0 = Date.parse(data[0]!.date), t1 = Date.parse(data.at(-1)!.date) || t0 + 1;
  const x = (d: string) => P + ((Date.parse(d) - t0) / Math.max(1, t1 - t0)) * (W - 2 * P);
  const y = (v: number) => H - P + ((v - min) / (max - min)) * -(H - 2 * P);
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(d.date).toFixed(1)},${y(d.avg).toFixed(1)}`).join(' ');
  const ticks = [min, (min + max) / 2, max];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Évolution du poids">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={P} x2={W - P} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray="3 3" />
          <text x={2} y={y(t) + 4} fontSize="9" fill="var(--muted)">{t.toFixed(1)}</text>
        </g>
      ))}
      {target && <line x1={P} x2={W - P} y1={y(target)} y2={y(target)} stroke="var(--accent)" strokeDasharray="4 3" />}
      {data.map((d) => (
        <circle key={d.date} cx={x(d.date)} cy={y(d.kg)} r={2.2} fill="var(--border)" />
      ))}
      <path d={path} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
