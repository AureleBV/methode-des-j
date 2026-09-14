import { describe, expect, it, vi } from 'vitest';
import { lookupBarcode, mapProduct, searchProducts } from './openFoodFacts';

const product = { code: '3017620422003', product_name_fr: 'Pâte à tartiner', brands: 'Marque, Autre', serving_quantity: 15, categories_tags: ['en:sweet-spreads'], nutriments: { 'energy-kcal_100g': 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9, fiber_100g: 0 } };

describe('openFoodFacts', () => {
  it('mapProduct convertit et rejette les produits incomplets', () => {
    const f = mapProduct(product);
    expect(f).toMatchObject({ id: 'off:3017620422003', name: 'Pâte à tartiner', brand: 'Marque', category: 'dessert', source: 'off', defaultGrams: 15 });
    expect(f?.per100.kcal).toBe(539);
    expect(mapProduct({ code: '1', product_name: 'X', nutriments: { proteins_100g: 1 } })).toBeNull();
  });

  it('lookupBarcode met en cache', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: 1, product }), { status: 200 }));
    const r1 = await lookupBarcode('3017620422003', fetchMock as unknown as typeof fetch);
    expect(r1.ok && r1.fromCache).toBe(false);
    const r2 = await lookupBarcode('3017620422003', fetchMock as unknown as typeof fetch);
    expect(r2.ok && r2.fromCache).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gère les erreurs réseau et 404', async () => {
    const r = await lookupBarcode('999', (async () => new Response('', { status: 404 })) as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, error: 'not_found' });
    const s = await searchProducts('skyr nature', (async () => { throw new Error('boom'); }) as unknown as typeof fetch);
    expect(s).toEqual({ ok: false, error: 'error' });
    const short = await searchProducts('ab');
    expect(short.ok && short.data).toEqual([]);
  });
});
