import { useEffect, useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';

/* ————— Boutons ————— */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
const VARIANT: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:opacity-90 shadow-sm',
  accent: 'bg-accent text-ink hover:opacity-90 shadow-sm',
  secondary: 'bg-surface-2 text-ink hover:bg-line',
  ghost: 'bg-transparent text-primary hover:bg-primary-soft',
  danger: 'bg-coral-soft text-coral hover:opacity-90',
};

export function Button({ variant = 'primary', size = 'md', className = '', block, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; block?: boolean }) {
  const s = size === 'sm' ? 'px-3 py-1.5 text-sm rounded-xl' : size === 'lg' ? 'px-5 py-3.5 text-base rounded-2xl' : 'px-4 py-2.5 text-[15px] rounded-2xl';
  return <button type="button" {...props} className={`inline-flex items-center justify-center gap-2 font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${VARIANT[variant]} ${s} ${block ? 'w-full' : ''} ${className}`} />;
}

export function IconButton({ className = '', label, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button type="button" aria-label={label} title={label} {...props} className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-lg transition hover:bg-line active:scale-95 ${className}`} />;
}

/* ————— Conteneurs ————— */

export function Card({ children, className = '', onClick, as: Tag = 'div' }: { children: ReactNode; className?: string; onClick?: () => void; as?: 'div' | 'section' | 'button' }) {
  const interactive = onClick ? 'cursor-pointer transition hover:shadow-md active:scale-[0.99] text-left w-full' : '';
  return (
    <Tag onClick={onClick} className={`rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${interactive} ${className}`}>
      {children}
    </Tag>
  );
}

export function PageHeader({ title, subtitle, right, back }: { title: string; subtitle?: ReactNode; right?: ReactNode; back?: () => void }) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2 min-w-0">
        {back && (
          <button type="button" onClick={back} aria-label="Retour" className="mt-0.5 -ml-2 h-9 w-9 shrink-0 rounded-full text-xl hover:bg-surface-2">
            ‹
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between">
      <h2 className="text-[13px] font-bold uppercase tracking-wide text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ emoji, title, text, action }: { emoji: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center">
      <div className="text-3xl">{emoji}</div>
      <p className="mt-2 font-semibold">{title}</p>
      {text && <p className="mt-1 text-sm text-muted">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Note({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warm' | 'info' }) {
  const c = tone === 'warm' ? 'bg-accent-soft' : tone === 'info' ? 'bg-blue-soft' : 'bg-surface-2';
  return <div className={`rounded-xl px-3 py-2.5 text-[13px] leading-snug text-ink/80 ${c}`}>{children}</div>;
}

/* ————— Chips / segments ————— */

export function Chip({ active, children, onClick, tone = 'primary', className = '' }: { active?: boolean; children: ReactNode; onClick?: () => void; tone?: 'primary' | 'coral' | 'accent'; className?: string }) {
  const on = tone === 'coral' ? 'bg-coral text-white' : tone === 'accent' ? 'bg-accent text-ink' : 'bg-primary text-white';
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition active:scale-95 ${active ? on : 'bg-surface-2 text-ink hover:bg-line'} ${className}`}>
      {children}
    </button>
  );
}

export function ChipRow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1 ${className}`}>{children}</div>;
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[] }) {
  return (
    <div className="flex rounded-2xl bg-surface-2 p-1">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={o.value === value} className={`flex-1 rounded-xl px-2 py-2 text-sm font-semibold transition ${o.value === value ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ————— Formulaires ————— */

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

const inputCls = 'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${className}`} />;
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${inputCls} appearance-none ${className}`}>
      {children}
    </select>
  );
}

export function NumberInput({ value, onChange, suffix, min = 0, max = 100000, step = 1, className = '', ...rest }: { value: number; onChange: (v: number) => void; suffix?: string; min?: number; max?: number; step?: number; className?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [text, setText] = useState(String(value));
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    // Synchronisation valeur externe -> texte (pattern "derive state during render").
    setPrev(value);
    if (Number(text) !== value) setText(String(value));
  }
  return (
    <div className={`relative ${className}`}>
      <input
        {...rest}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value !== '' && Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
        onBlur={() => setText(String(value))}
        className={`${inputCls} ${suffix ? 'pr-12' : ''}`}
      />
      {suffix && <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-muted">{suffix}</span>}
    </div>
  );
}

export function Stepper({ value, onChange, step = 10, min = 0, suffix = 'g', quick }: { value: number; onChange: (v: number) => void; step?: number; min?: number; suffix?: string; quick?: { label: string; value: number }[] }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <IconButton label="Moins" onClick={() => onChange(Math.max(min, value - step))}>
          −
        </IconButton>
        <NumberInput value={value} onChange={onChange} suffix={suffix} className="flex-1" min={min} />
        <IconButton label="Plus" onClick={() => onChange(value + step)}>
          +
        </IconButton>
      </div>
      {quick && quick.length > 0 && (
        <ChipRow className="mt-2">
          {quick.map((q) => (
            <Chip key={q.label} active={q.value === value} onClick={() => onChange(q.value)}>
              {q.label}
            </Chip>
          ))}
        </ChipRow>
      )}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-3 py-2">
      <span className="text-[15px]">{label}</span>
      <span className={`relative inline-block h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-primary' : 'bg-line'}`}>
        <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-6' : 'left-1'}`} />
      </span>
    </label>
  );
}

/* ————— Progression ————— */

export function ProgressRing({ value, max, size = 128, stroke = 11, color = 'var(--primary)', children }: { value: number; max: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - ratio)} style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function Bar({ value, max, color = 'var(--primary)', height = 8 }: { value: number; max: number; color?: string; height?: number }) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="w-full overflow-hidden rounded-full bg-line" style={{ height }}>
      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${ratio * 100}%`, background: color }} />
    </div>
  );
}

export function MacroPills({ kcal, protein, carbs, fat, compact }: { kcal: number; protein: number; carbs: number; fat: number; compact?: boolean }) {
  const cls = compact ? 'text-[12px]' : 'text-[13px]';
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-0.5 ${cls} text-muted`}>
      <span className="font-semibold text-ink">{Math.round(kcal)} kcal</span>
      <span>
        <b className="text-primary">P</b> {Math.round(protein)} g
      </span>
      <span>
        <b className="text-accent">G</b> {Math.round(carbs)} g
      </span>
      <span>
        <b className="text-coral">L</b> {Math.round(fat)} g
      </span>
    </div>
  );
}

/* ————— Sheet (tiroir bas) ————— */

export function Sheet({ open, onClose, title, children, full }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; full?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`sheet-in relative flex w-full max-w-lg flex-col rounded-t-3xl bg-bg shadow-2xl sm:rounded-3xl ${full ? 'h-[92dvh]' : 'max-h-[92dvh]'}`}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-line sm:hidden absolute left-1/2 top-2 -translate-x-1/2" />
          <h2 className="mt-2 text-lg font-bold">{title}</h2>
          <IconButton label="Fermer" onClick={onClose} className="mt-2">
            ✕
          </IconButton>
        </div>
        <div className="safe-bottom flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/* ————— Toast ————— */

type ToastMsg = { id: number; text: string };
let listeners: ((m: ToastMsg) => void)[] = [];
let counter = 0;
export function toast(text: string) {
  const m = { id: ++counter, text };
  listeners.forEach((l) => l(m));
}

export function ToastHost() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(() => {
    const l = (m: ToastMsg) => {
      setItems((s) => [...s, m]);
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== m.id)), 2400);
    };
    listeners.push(l);
    return () => {
      listeners = listeners.filter((x) => x !== l);
    };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4">
      {items.map((m) => (
        <div key={m.id} className="fade-in rounded-full bg-ink px-4 py-2 text-sm font-medium text-bg shadow-lg">
          {m.text}
        </div>
      ))}
    </div>
  );
}

export function Spinner() {
  return <div className="mx-auto my-6 h-6 w-6 animate-spin rounded-full border-2 border-line border-t-primary" />;
}
