/**
 * Voix, 100 % navigateur (Web Speech API) : reconnaissance (dictée) et
 * synthèse (lecture des recettes). Rien n'est envoyé à un serveur par
 * l'app ; selon le navigateur, la reconnaissance peut passer par le service
 * vocal du système (Google sur Android, Apple sur iOS).
 */

interface RecognitionResultLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: RecognitionResultLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => RecognitionLike;

function getRecognitionCtor(): RecognitionCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function isDictationSupported(): boolean {
  return typeof window !== 'undefined' && !!getRecognitionCtor();
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export interface DictationHandle {
  stop: () => void;
  result: Promise<string>;
}

/** Écoute une phrase et la renvoie. Rejette si non supporté, refusé ou silence. */
export function dictate(lang = 'fr-FR'): DictationHandle {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    return { stop: () => undefined, result: Promise.reject(new Error('unsupported')) };
  }
  const rec = new Ctor();
  rec.lang = lang;
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.continuous = false;
  let settled = false;
  const result = new Promise<string>((resolve, reject) => {
    rec.onresult = (e) => {
      settled = true;
      const text = Array.from(e.results, (r) => r[0]?.transcript ?? '').join(' ').trim();
      resolve(text);
    };
    rec.onerror = (e) => {
      settled = true;
      reject(new Error(e.error));
    };
    rec.onend = () => {
      if (!settled) reject(new Error('no-speech'));
    };
    try {
      rec.start();
    } catch (e) {
      reject(e as Error);
    }
  });
  return { stop: () => rec.stop(), result };
}

export const DICTATION_ERRORS: Record<string, string> = {
  unsupported: 'La dictée n’est pas disponible sur ce navigateur (essaie Chrome).',
  'not-allowed': 'Accès au micro refusé. Autorise-le dans les réglages du navigateur.',
  'no-speech': 'Je n’ai rien entendu. Réessaie en parlant un peu plus fort.',
  network: 'Le service vocal du navigateur est injoignable (hors ligne ?).',
  aborted: 'Dictée annulée.',
};

let current: SpeechSynthesisUtterance | null = null;

export function speak(text: string, lang = 'fr-FR', rate = 1): Promise<void> {
  if (!isSpeechSupported()) return Promise.reject(new Error('unsupported'));
  stopSpeaking();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('fr'));
    if (voice) u.voice = voice;
    u.onend = () => {
      if (current === u) current = null;
      resolve();
    };
    u.onerror = () => resolve();
    current = u;
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
  current = null;
}

export function isSpeaking(): boolean {
  return isSpeechSupported() && window.speechSynthesis.speaking;
}
