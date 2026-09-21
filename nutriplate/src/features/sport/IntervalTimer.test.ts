import { describe, expect, it } from 'vitest';
import { tick } from './IntervalTimer';

describe('IntervalTimer.tick', () => {
  it('enchaîne travail → repos → travail et termine au dernier round', () => {
    let s = { phase: 'work' as const, round: 0, left: 2 };
    s = tick(s, 2, 2, 1) as typeof s;
    expect(s).toEqual({ phase: 'work', round: 0, left: 1 });
    let n = tick(s, 2, 2, 1);
    expect(n).toEqual({ phase: 'rest', round: 0, left: 1 });
    n = tick(n, 2, 2, 1);
    expect(n).toEqual({ phase: 'work', round: 1, left: 2 });
    n = tick({ ...n, left: 1 }, 2, 2, 1);
    expect(n.phase).toBe('done');
    expect(tick({ phase: 'idle', round: 0, left: 5 }, 2, 2, 1).phase).toBe('idle');
  });
});
