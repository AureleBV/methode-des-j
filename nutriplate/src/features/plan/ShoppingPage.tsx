import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/domain/preferences';
import { formatShoppingQty } from '@/domain/planner';
import type { FoodCategory, ShoppingListItem } from '@/domain/types';
import { addDays, today } from '@/domain/weight';
import { addShoppingItem, createShoppingListFromPlan, deleteShoppingItem, deleteShoppingList, toggleShoppingItem } from '@/lib/actions';
import { mondayOf } from '@/lib/format';
import { useAllPriceRecords, useAllVariants, useFavorites, useFoodMap, useRecipeViews } from '@/lib/hooks';
import { estimateCost, formatEur, packsNeeded, preferredVariant, summarizeRecords } from '@/domain/prices';
import { Link } from 'react-router-dom';
import { Button, Card, EmptyState, Input, PageHeader, Select, toast } from '@/components/ui';

export function ShoppingPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const lists = useLiveQuery(() => db.shoppingLists.orderBy('createdAt').reverse().toArray(), []) ?? [];
  const listId = params.get('list') ?? lists[0]?.id;
  const itemsQ = useLiveQuery(async () => (listId ? db.shoppingListItems.where('listId').equals(listId).toArray() : ([] as ShoppingListItem[])), [listId]);
  const items = useMemo(() => itemsQ ?? [], [itemsQ]);
  const foodMap = useFoodMap();
  const { views, byId } = useRecipeViews();
  const favs = useFavorites();
  const variants = useAllVariants();
  const priceRecords = useAllPriceRecords();
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState<FoodCategory>('other');
  const list = lists.find((l) => l.id === listId);

  const grouped = useMemo(() => {
    const g = new Map<FoodCategory, typeof items>();
    for (const it of items) g.set(it.category, [...(g.get(it.category) ?? []), it]);
    return CATEGORY_ORDER.filter((c) => g.has(c)).map((c) => ({ category: c, items: g.get(c)!.sort((a, b) => Number(a.checked) - Number(b.checked) || a.name.localeCompare(b.name)) }));
  }, [items]);

  async function fromWeek() {
    const start = mondayOf(today());
    const entries = await db.planEntries.where('date').between(start, addDays(start, 6), true, true).toArray();
    if (entries.length === 0) return toast('Planifie d’abord ta semaine');
    const id = await createShoppingListFromPlan('Courses de la semaine', entries, byId);
    setParams({ list: id });
  }
  async function fromFavorites() {
    const favViews = views.filter((v) => favs.recipeIds.has(v.recipe.id));
    if (favViews.length === 0) return toast('Ajoute des recettes en favoris d’abord');
    const id = await createShoppingListFromPlan('Courses recettes favorites', [], byId, favViews);
    setParams({ list: id });
  }

  const done = items.filter((i) => i.checked).length;
  /** Produit habituel + coût estimé par article (prix moyen/kg relevé). */
  const enriched = useMemo(() => {
    const m = new Map<string, { productName?: string; packs?: number | null; cost: number | null }>();
    for (const it of items) {
      if (!it.foodId) continue;
      const v = preferredVariant(it.foodId, variants);
      const sum = summarizeRecords(priceRecords.filter((r) => r.foodId === it.foodId), v?.packGrams);
      m.set(it.id, { productName: v ? [v.brand, v.name].filter(Boolean).join(' · ') : undefined, packs: packsNeeded(it.grams, v, foodMap.get(it.foodId)), cost: estimateCost(it.grams, sum?.avgPerKg) });
    }
    return m;
  }, [items, variants, priceRecords, foodMap]);
  const totalCost = [...enriched.values()].reduce((s, e) => s + (e.cost ?? 0), 0);
  const priced = [...enriched.values()].filter((e) => e.cost !== null).length;

  return (
    <div className="fade-in">
      <PageHeader title="Courses" back={() => nav(-1)} subtitle={list ? `${done} / ${items.length} cochés${priced ? ` · ≈ ${formatEur(totalCost)} (${priced} article${priced > 1 ? 's' : ''} avec prix)` : ''}` : undefined} right={<Link to="/courses/magasins" className="rounded-full bg-surface-2 px-3 py-2 text-sm font-semibold">📍 Où acheter</Link>} />
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={fromWeek}>📅 Depuis la semaine</Button>
        <Button size="sm" variant="secondary" onClick={fromFavorites}>♥ Depuis les favoris</Button>
      </div>
      {lists.length > 1 && (
        <div className="mt-3">
          <Select value={listId} onChange={(e) => setParams({ list: e.target.value })}>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        </div>
      )}
      {!list ? (
        <div className="mt-4">
          <EmptyState emoji="🛒" title="Pas encore de liste" text="Génère-la depuis ta semaine planifiée ou tes recettes favorites." />
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {grouped.map((g) => (
            <Card key={g.category} className="!p-3">
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">{CATEGORY_LABELS[g.category]}</h3>
              <ul>
                {g.items.map((it) => (
                  <li key={it.id} className="flex items-center gap-3 py-1.5">
                    <input type="checkbox" checked={it.checked} onChange={(e) => toggleShoppingItem(it.id, e.target.checked)} className="h-5 w-5 accent-[var(--primary)]" aria-label={it.name} />
                    <span className={`min-w-0 flex-1 text-sm ${it.checked ? 'text-muted line-through' : ''}`}>
                      <span className="block truncate">{it.name}</span>
                      {enriched.get(it.id)?.productName && <span className="block truncate text-[11px] text-muted">🏷️ {enriched.get(it.id)!.productName}{enriched.get(it.id)!.packs ? ` × ${enriched.get(it.id)!.packs}` : ''}</span>}
                    </span>
                    <span className="text-right text-xs text-muted">
                      {formatShoppingQty(it.grams, it.foodId ? foodMap.get(it.foodId) : undefined)}
                      {enriched.get(it.id)?.cost !== null && enriched.get(it.id)?.cost !== undefined && <span className="block">≈ {formatEur(enriched.get(it.id)!.cost!)}</span>}
                    </span>
                    <button type="button" onClick={() => deleteShoppingItem(it.id)} className="text-muted" aria-label="Retirer">✕</button>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
          <Card className="!p-3">
            <p className="mb-2 text-sm font-semibold">Ajouter un article</p>
            <div className="flex gap-2">
              <Input placeholder="Ex : sel, papier alu…" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <Select value={newCat} onChange={(e) => setNewCat(e.target.value as FoodCategory)} className="!w-36">
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </Select>
              <Button onClick={async () => { if (!newName.trim()) return; await addShoppingItem(list.id, newName.trim(), newCat, 0); setNewName(''); }}>+</Button>
            </div>
          </Card>
          <Button variant="danger" block onClick={async () => { if (confirm('Supprimer cette liste ?')) { await deleteShoppingList(list.id); setParams({}); } }}>
            Supprimer la liste
          </Button>
        </div>
      )}
    </div>
  );
}
