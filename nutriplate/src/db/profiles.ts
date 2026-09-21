/**
 * Registre des profils (plusieurs personnes sur le même appareil).
 * Chaque profil a sa propre base IndexedDB ; le registre et le profil actif
 * vivent dans localStorage. Changer de profil recharge l'app.
 */
export interface ProfileEntry {
  id: string;
  name: string;
  emoji: string;
  createdAt: number;
}

const KEY_LIST = 'nutriplate.profiles';
const KEY_ACTIVE = 'nutriplate.activeProfile';
/** Le tout premier profil garde la base historique "nutriplate". */
export const DEFAULT_PROFILE_ID = 'default';

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* stockage indisponible (navigation privée) : on reste en mémoire */
  }
}

export function listProfiles(): ProfileEntry[] {
  const raw = safeGet(KEY_LIST);
  if (!raw) return [{ id: DEFAULT_PROFILE_ID, name: 'Moi', emoji: '🙂', createdAt: 0 }];
  try {
    const list = JSON.parse(raw) as ProfileEntry[];
    return list.length ? list : [{ id: DEFAULT_PROFILE_ID, name: 'Moi', emoji: '🙂', createdAt: 0 }];
  } catch {
    return [{ id: DEFAULT_PROFILE_ID, name: 'Moi', emoji: '🙂', createdAt: 0 }];
  }
}

export function activeProfileId(): string {
  return safeGet(KEY_ACTIVE) ?? DEFAULT_PROFILE_ID;
}

export function activeDbName(): string {
  const id = activeProfileId();
  return id === DEFAULT_PROFILE_ID ? 'nutriplate' : `nutriplate-${id}`;
}

export function dbNameFor(id: string): string {
  return id === DEFAULT_PROFILE_ID ? 'nutriplate' : `nutriplate-${id}`;
}

function saveList(list: ProfileEntry[]) {
  safeSet(KEY_LIST, JSON.stringify(list));
}

export function createProfile(name: string, emoji: string): ProfileEntry {
  const entry: ProfileEntry = { id: Math.random().toString(36).slice(2, 10), name: name.trim() || 'Profil', emoji: emoji || '🙂', createdAt: Date.now() };
  saveList([...listProfiles(), entry]);
  return entry;
}

export function renameProfile(id: string, name: string, emoji: string) {
  saveList(listProfiles().map((p) => (p.id === id ? { ...p, name: name.trim() || p.name, emoji: emoji || p.emoji } : p)));
}

export function removeProfileEntry(id: string) {
  saveList(listProfiles().filter((p) => p.id !== id));
}

/** Change le profil actif et recharge l'application (nouvelle base). */
export function switchProfile(id: string) {
  safeSet(KEY_ACTIVE, id);
  window.location.reload();
}

export function ensureRegistryHasActive() {
  const list = listProfiles();
  if (!list.some((p) => p.id === activeProfileId())) safeSet(KEY_ACTIVE, list[0]!.id);
  if (!safeGet(KEY_LIST)) saveList(list);
}
