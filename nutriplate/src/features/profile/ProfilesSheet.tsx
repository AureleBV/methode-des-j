import { useState } from 'react';
import { activeProfileId, createProfile, dbNameFor, listProfiles, removeProfileEntry, renameProfile, switchProfile, type ProfileEntry } from '@/db/profiles';
import { deleteProfileDatabase } from '@/lib/actions';
import { Button, Input, Note, Sheet, toast } from '@/components/ui';

const EMOJIS = ['🙂', '😎', '🧑‍🍳', '💪', '🦊', '🐼', '🌻', '🚀', '🎯', '🍀'];

/** Plusieurs personnes sur le même téléphone : chacune sa base, ses goûts, ses objectifs. */
export function ProfilesSheet({ onClose }: { onClose: () => void }) {
  const [profiles, setProfiles] = useState<ProfileEntry[]>(listProfiles());
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🙂');
  const active = activeProfileId();
  const refresh = () => setProfiles(listProfiles());

  return (
    <Sheet open onClose={onClose} title="Profils sur cet appareil">
      <div className="space-y-3">
        <Note>Chaque profil a ses propres données, entièrement séparées (objectifs, journal, goûts, poids). Changer de profil recharge l’app.</Note>
        {profiles.map((p) => (
          <div key={p.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${p.id === active ? 'border-primary bg-primary-soft' : 'border-line bg-surface'}`}>
            <span className="text-2xl">{p.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{p.name}{p.id === active ? ' · actif' : ''}</div>
            </div>
            {p.id !== active ? (
              <Button size="sm" onClick={() => switchProfile(p.id)}>Ouvrir</Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => { const n = prompt('Nom du profil', p.name); if (n) { renameProfile(p.id, n, p.emoji); refresh(); } }}>Renommer</Button>
            )}
            {profiles.length > 1 && (
              <button type="button" className="text-muted" aria-label="Supprimer" onClick={async () => { if (!confirm(`Supprimer le profil « ${p.name} » et TOUTES ses données ? Irréversible.`)) return; await deleteProfileDatabase(dbNameFor(p.id)); removeProfileEntry(p.id); if (p.id === active) switchProfile(listProfiles()[0]!.id); else refresh(); toast('Profil supprimé'); }}>✕</button>
            )}
          </div>
        ))}
        <div className="rounded-xl border border-dashed border-line p-3">
          <p className="mb-2 text-sm font-semibold">Nouveau profil</p>
          <div className="flex gap-2">
            <Input placeholder="Prénom" value={name} onChange={(e) => setName(e.target.value)} />
            <select value={emoji} onChange={(e) => setEmoji(e.target.value)} className="rounded-xl border border-line bg-surface px-2" aria-label="Avatar">
              {EMOJIS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <Button block className="mt-2" onClick={() => { if (!name.trim()) return toast('Donne un prénom'); const p = createProfile(name, emoji); toast('Profil créé, ouverture…'); switchProfile(p.id); }}>
            Créer et ouvrir
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
