import { Link } from 'react-router-dom';
import type { RecipeView } from '@/domain/planner';
import { satietyFlames, satietyLabel } from '@/domain/satiety';
import { MacroPills } from '@/components/ui';

export const EQUIPMENT_LABELS: Record<string, string> = { microwave: 'Micro-ondes', pan: 'Poêle', airfryer: 'Air Fryer', oven: 'Four', none: 'Sans cuisson' };
export const DIFFICULTY_LABELS: Record<string, string> = { easy: 'Facile', medium: 'Moyen', hard: 'Élaboré' };

export function RecipeCard({ view, badge, compact, onAction, actionLabel }: { view: RecipeView; badge?: string; compact?: boolean; onAction?: () => void; actionLabel?: string }) {
  const r = view.recipe;
  return (
    <div className="flex items-stretch gap-3 rounded-2xl border border-line bg-surface p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <Link to={`/repas/${r.id}`} className="flex flex-1 items-center gap-3 min-w-0">
        <RecipeThumb view={view} size={compact ? 52 : 64} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold leading-tight">{r.name}</h3>
            {badge && <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold">{badge}</span>}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            ⏱ {r.prepMinutes} min · {r.equipment.map((e) => EQUIPMENT_LABELS[e]).join(' / ')} · <span title={satietyLabel(view.satiety)}>{satietyFlames(view.satiety)}</span>
          </div>
          <div className="mt-1">
            <MacroPills compact {...view.macros} />
          </div>
        </div>
      </Link>
      {onAction && (
        <button type="button" onClick={onAction} className="self-center shrink-0 rounded-xl bg-primary-soft px-3 py-2 text-sm font-semibold text-primary hover:opacity-90">
          {actionLabel ?? '+'}
        </button>
      )}
    </div>
  );
}

export function RecipeThumb({ view, size = 64 }: { view: RecipeView; size?: number }) {
  const r = view.recipe;
  if (r.imageDataUrl) return <img src={r.imageDataUrl} alt="" className="shrink-0 rounded-xl object-cover" style={{ width: size, height: size }} />;
  const hue = [...r.id].reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
  return (
    <div className="flex shrink-0 items-center justify-center rounded-xl" style={{ width: size, height: size, fontSize: size * 0.5, background: `linear-gradient(135deg, hsl(${hue} 60% 92%), hsl(${(hue + 40) % 360} 60% 84%))` }} aria-hidden>
      {r.emoji}
    </div>
  );
}
