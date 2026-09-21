import { useEffect, useRef, useState } from 'react';
import { Button, Card } from '@/components/ui';
import { isSpeechSupported, speak } from '@/services/speech';

type Phase = 'idle' | 'work' | 'rest' | 'done';
interface TimerState {
  phase: Phase;
  round: number;
  left: number;
}

/** Transition d'une seconde : pure, testable, sans effet de bord. */
export function tick(s: TimerState, rounds: number, workSec: number, restSec: number): TimerState {
  if (s.phase !== 'work' && s.phase !== 'rest') return s;
  if (s.left > 1) return { ...s, left: s.left - 1 };
  if (s.phase === 'work') {
    if (s.round + 1 >= rounds) return { phase: 'done', round: s.round, left: 0 };
    return { phase: 'rest', round: s.round, left: restSec };
  }
  return { phase: 'work', round: s.round + 1, left: workSec };
}

/** Chrono HIIT / fractionné : rounds travail / repos, bips (Web Audio) et annonce vocale facultative. */
export function IntervalTimer({ rounds, workSec, restSec, exercises, onFinish }: { rounds: number; workSec: number; restSec: number; exercises: string[]; onFinish?: () => void }) {
  const [s, setS] = useState<TimerState>({ phase: 'idle', round: 0, left: workSec });
  const [voice, setVoice] = useState(false);
  const ctx = useRef<AudioContext | null>(null);
  const prevPhase = useRef<Phase>('idle');

  const beep = (freq = 880, ms = 150) => {
    try {
      ctx.current ??= new AudioContext();
      const o = ctx.current.createOscillator();
      const g = ctx.current.createGain();
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.current.destination);
      g.gain.value = 0.15;
      o.start();
      o.stop(ctx.current.currentTime + ms / 1000);
    } catch {
      /* audio indisponible */
    }
  };

  // Horloge : une transition par seconde, calculée à partir de l'état précédent.
  useEffect(() => {
    if (s.phase !== 'work' && s.phase !== 'rest') return;
    const id = window.setInterval(() => setS((prev) => tick(prev, rounds, workSec, restSec)), 1000);
    return () => window.clearInterval(id);
  }, [s.phase, rounds, workSec, restSec]);

  // Sons et voix : uniquement des effets de bord, jamais de setState ici.
  useEffect(() => {
    if ((s.phase === 'work' || s.phase === 'rest') && s.left <= 3 && s.left >= 1) beep(660, 100);
  }, [s.left, s.phase]);
  useEffect(() => {
    if (prevPhase.current === s.phase) return;
    prevPhase.current = s.phase;
    if (s.phase === 'work') {
      beep(1000, 300);
      if (voice && isSpeechSupported()) speak(exercises[s.round % Math.max(1, exercises.length)] ?? 'Go');
    } else if (s.phase === 'rest') {
      beep(440, 300);
      if (voice && isSpeechSupported()) speak('Repos.');
    } else if (s.phase === 'done') {
      beep(1200, 500);
      if (voice && isSpeechSupported()) speak('Séance terminée, bravo.');
      onFinish?.();
    }
  }, [s.phase, s.round, voice, exercises, onFinish]);

  const start = () => setS({ phase: 'work', round: 0, left: workSec });
  const current = exercises[s.round % Math.max(1, exercises.length)];
  const tone = s.phase === 'work' ? 'bg-primary text-white' : s.phase === 'rest' ? 'bg-accent-soft' : 'bg-surface-2';

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold">⏱ Chrono · {rounds} × {workSec} s / {restSec} s</p>
        <button type="button" onClick={() => setVoice(!voice)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${voice ? 'bg-primary text-white' : 'bg-surface-2'}`} disabled={!isSpeechSupported()}>{voice ? '🔊 Voix' : '🔇 Voix'}</button>
      </div>
      <div className={`rounded-2xl p-5 text-center transition ${tone}`}>
        <div className="text-sm opacity-80">{s.phase === 'idle' ? 'Prêt ?' : s.phase === 'done' ? 'Terminé 🎉' : s.phase === 'work' ? `Round ${s.round + 1}/${rounds} · ${current}` : `Repos · ensuite : ${exercises[(s.round + 1) % Math.max(1, exercises.length)] ?? ''}`}</div>
        <div className="text-6xl font-bold tabular-nums">{s.phase === 'idle' ? workSec : Math.max(0, s.left)}</div>
      </div>
      <div className="flex gap-2">
        {s.phase === 'idle' || s.phase === 'done' ? (
          <Button block size="lg" onClick={start}>{s.phase === 'done' ? 'Refaire' : 'Démarrer'}</Button>
        ) : (
          <>
            <Button block variant="secondary" onClick={() => setS({ phase: 'idle', round: 0, left: workSec })}>Stop</Button>
            <Button block variant="secondary" onClick={() => setS((prev) => tick({ ...prev, left: 1 }, rounds, workSec, restSec))}>Passer ›</Button>
          </>
        )}
      </div>
    </Card>
  );
}
