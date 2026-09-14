import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input } from '@/components/ui';

/**
 * Scanner de code-barres : utilise l'API BarcodeDetector quand elle existe
 * (Chrome Android, Safari récent), sinon saisie manuelle.
 */
interface DetectorLike {
  detect(source: ImageBitmapSource): Promise<{ rawValue: string }[]>;
}
type DetectorCtor = new (opts: { formats: string[] }) => DetectorLike;

const getDetectorCtor = () => (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;

export function BarcodeScanner({ onDetect, onClose }: { onDetect: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [supported, setSupported] = useState<boolean>(() => !!getDetectorCtor() && !!navigator.mediaDevices?.getUserMedia);
  const [manual, setManual] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const Ctor = getDetectorCtor();
    if (!supported || !Ctor) return;
    let stream: MediaStream | undefined;
    let raf = 0;
    let stopped = false;
    const detector = new Ctor({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const c = codes[0]?.rawValue;
            if (c) {
              stopped = true;
              onDetect(c);
              return;
            }
          } catch {
            /* frame non lisible : on continue */
          }
          raf = window.setTimeout(tick, 200);
        };
        tick();
      } catch {
        setError('Caméra indisponible. Saisis le code à la main.');
        setSupported(false);
      }
    })();
    return () => {
      stopped = true;
      window.clearTimeout(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetect, supported]);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-black text-white">
      <div className="flex items-center justify-between p-4">
        <span className="font-semibold">Scanner un code-barres</span>
        <button type="button" onClick={onClose} className="rounded-full bg-white/20 px-3 py-1">Fermer</button>
      </div>
      {supported && !error ? (
        <div className="relative flex-1">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-32 -translate-y-1/2 rounded-2xl border-2 border-white/80" />
        </div>
      ) : (
        <div className="flex-1 px-4 pt-6 text-sm text-white/80">{error ?? 'Le scan caméra n’est pas disponible sur ce navigateur (essaie Chrome sur Android).'}</div>
      )}
      <div className="safe-bottom flex gap-2 p-4">
        <Input inputMode="numeric" placeholder="Ou tape le code (EAN)" value={manual} onChange={(e) => setManual(e.target.value)} className="!bg-white/10 !text-white !border-white/30" />
        <Button onClick={() => manual.trim() && onDetect(manual.trim())}>OK</Button>
      </div>
    </div>,
    document.body,
  );
}
