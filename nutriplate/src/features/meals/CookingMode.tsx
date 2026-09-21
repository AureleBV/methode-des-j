import { useEffect, useState } from 'react';
import type { RecipeView } from '@/domain/planner';
import { isSpeechSupported, speak, stopSpeaking } from '@/services/speech';
import { Button, Sheet } from '@/components/ui';

/** Mode cuisine : étapes en grand, lecture à voix haute (synthèse vocale du navigateur). */
export function CookingMode({ view, onClose }: { view: RecipeView; onClose: () => void }) {
  const steps = view.recipe.instructions;
  const [i, setI] = useState(-1); // -1 = ingrédients
  const [voice, setVoice] = useState(isSpeechSupported());
  const ingredientsText = view.ingredients.map((x) => `${x.grams} grammes de ${x.food.name}`).join(', ');
  const current = i < 0 ? `Ingrédients : ${ingredientsText}.` : `Étape ${i + 1} sur ${steps.length}. ${steps[i]}`;

  useEffect(() => {
    if (voice) speak(current).catch(() => setVoice(false));
    return () => stopSpeaking();
  }, [current, voice]);

  return (
    <Sheet open onClose={onClose} title={view.recipe.name} full>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>{i < 0 ? 'Ingrédients' : `Étape ${i + 1} / ${steps.length}`}</span>
          <button type="button" onClick={() => { if (voice) stopSpeaking(); setVoice(!voice); }} className={`rounded-full px-3 py-1 text-xs font-semibold ${voice ? 'bg-primary text-white' : 'bg-surface-2'}`} disabled={!isSpeechSupported()}>
            {voice ? '🔊 Lecture activée' : '🔇 Lecture coupée'}
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center py-6">
          {i < 0 ? (
            <ul className="w-full space-y-2 text-lg">
              {view.ingredients.map((x) => (
                <li key={x.id} className="flex justify-between rounded-xl bg-surface px-4 py-2 border border-line"><span>{x.food.name}</span><b>{x.grams} g</b></li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-2xl font-semibold leading-snug">{steps[i]}</p>
          )}
        </div>
        <div className="flex gap-2 pb-2">
          <Button variant="secondary" size="lg" onClick={() => setI((v) => Math.max(-1, v - 1))} disabled={i < 0}>‹ Précédent</Button>
          {i < steps.length - 1 ? (
            <Button block size="lg" onClick={() => setI((v) => v + 1)}>{i < 0 ? 'Commencer' : 'Étape suivante ›'}</Button>
          ) : (
            <Button block size="lg" onClick={onClose}>Terminé 🍽️</Button>
          )}
        </div>
        {!isSpeechSupported() && <p className="pb-2 text-center text-xs text-muted">La lecture à voix haute n’est pas disponible sur ce navigateur.</p>}
      </div>
    </Sheet>
  );
}
