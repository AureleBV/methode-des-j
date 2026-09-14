import { useState } from 'react';
import type { Food, FoodCategory, PreferenceLevel } from '@/domain/types';
import { Chip, ChipRow } from '@/components/ui';

const LEVELS: { value: PreferenceLevel; label: string; emoji: string }[] = [
  { value: 'love', label: 'J’adore', emoji: '😍' },
  { value: 'ok', label: 'Ok', emoji: '🙂' },
  { value: 'hate', label: 'Je déteste', emoji: '🙅' },
  { value: 'allergy', label: 'Allergie', emoji: '⚠️' },
];

const TAG_GROUPS: { tag: string; label: string; hint: string }[] = [
  { tag: 'crudite', label: 'Crudités (salade, tomate crue, concombre…)', hint: 'Si tu détestes, on privilégie les légumes cuits.' },
  { tag: 'cooked', label: 'Légumes cuits', hint: '' },
  { tag: 'lactose', label: 'Produits laitiers', hint: '' },
  { tag: 'gluten', label: 'Gluten (pain, pâtes, wraps)', hint: '' },
];

export function PreferencePicker({ foods, prefs, tagPrefs, onFood, onTag, categories, labels }: { foods: Food[]; prefs: Record<string, PreferenceLevel>; tagPrefs: Record<string, PreferenceLevel>; onFood: (id: string, level: PreferenceLevel) => void; onTag: (tag: string, level: PreferenceLevel) => void; categories: FoodCategory[]; labels: Record<FoodCategory, string> }) {
  const [cat, setCat] = useState<FoodCategory | 'groups'>('groups');
  const list = foods.filter((f) => f.category === cat && f.source === 'local');
  return (
    <div>
      <ChipRow>
        <Chip active={cat === 'groups'} onClick={() => setCat('groups')}>
          Familles
        </Chip>
        {categories.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {labels[c]}
          </Chip>
        ))}
      </ChipRow>
      <div className="mt-2 space-y-1.5">
        {cat === 'groups'
          ? TAG_GROUPS.map((g) => <Row key={g.tag} name={g.label} hint={g.hint} level={tagPrefs[g.tag] ?? 'ok'} onChange={(l) => onTag(g.tag, l)} />)
          : list.map((f) => <Row key={f.id} name={f.name} level={prefs[f.id] ?? 'ok'} onChange={(l) => onFood(f.id, l)} />)}
      </div>
    </div>
  );
}

function Row({ name, hint, level, onChange }: { name: string; hint?: string; level: PreferenceLevel; onChange: (l: PreferenceLevel) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2 border border-line">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{name}</div>
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </div>
      <div className="flex shrink-0 gap-1">
        {LEVELS.map((l) => (
          <button key={l.value} type="button" title={l.label} aria-label={l.label} aria-pressed={level === l.value} onClick={() => onChange(l.value)} className={`h-8 w-8 rounded-full text-base transition ${level === l.value ? (l.value === 'hate' || l.value === 'allergy' ? 'bg-coral-soft ring-2 ring-coral' : 'bg-primary-soft ring-2 ring-primary') : 'opacity-50 hover:opacity-100'}`}>
            {l.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
