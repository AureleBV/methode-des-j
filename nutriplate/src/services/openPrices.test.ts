import { describe, expect, it, vi } from 'vitest';
import { fetchPriceStats, summarizePrices } from './openPrices';

const items = [
  { price: 3.2, currency: 'EUR', date: '2026-08-01', location: { osm_brand: 'Lidl' }, product: { product_quantity: 500, product_quantity_unit: 'g' } },
  { price: 3.8, currency: 'EUR', date: '2026-09-01', location: { osm_name: 'Carrefour City' }, product: { product_quantity: 500, product_quantity_unit: 'g' } },
  { price: 99, currency: 'USD', date: '2026-09-02' },
];

describe('openPrices', () => {
  it('résume les prix en euros', () => {
    const s = summarizePrices(items)!;
    expect(s.count).toBe(2);
    expect(s.avgEur).toBe(3.5);
    expect(s.avgPerKg).toBe(7);
    expect(s.stores).toEqual(['Lidl', 'Carrefour City']);
    expect(s.lastDate).toBe('2026-09-01');
    expect(summarizePrices([])).toBeNull();
  });
  it('met en cache', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ items }), { status: 200 }));
    const r1 = await fetchPriceStats('3000000000001', fetchMock as unknown as typeof fetch);
    const r2 = await fetchPriceStats('3000000000001', fetchMock as unknown as typeof fetch);
    expect(r1.ok && r1.data?.avgEur).toBe(3.5);
    expect(r2.ok && r2.fromCache).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
