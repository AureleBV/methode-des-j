import { describe, expect, it } from 'vitest';
import { buildQuery, haversineM, parseOverpass } from './overpass';

describe('overpass', () => {
  it('calcule les distances', () => {
    expect(haversineM(48.8566, 2.3522, 48.8566, 2.3522)).toBe(0);
    expect(haversineM(48.8566, 2.3522, 48.8606, 2.3376)).toBeGreaterThan(1100);
  });
  it('parse les éléments et trie par distance', () => {
    const shops = parseOverpass(
      [
        { type: 'node', id: 1, lat: 48.86, lon: 2.36, tags: { shop: 'supermarket', name: 'Monop', brand: 'Monoprix', opening_hours: 'Mo-Sa 08:00-21:00' } },
        { type: 'way', id: 2, center: { lat: 48.857, lon: 2.353 }, tags: { shop: 'butcher' } },
        { type: 'node', id: 3, lat: 48.9, lon: 2.4, tags: { amenity: 'marketplace', name: 'Marché' } },
        { type: 'node', id: 4, lat: 48.9, lon: 2.4 },
      ],
      48.8566,
      2.3522,
    );
    expect(shops.map((s) => s.id)).toEqual(['way/2', 'node/1', 'node/3']);
    expect(shops[0]!.name).toBe('Boucherie');
    expect(shops[1]!.brand).toBe('Monoprix');
    expect(shops[2]!.kind).toBe('marketplace');
  });
  it('construit une requête Overpass valide', () => {
    const q = buildQuery(48.857, 2.352, 1500);
    expect(q).toContain('around:1500,48.857,2.352');
    expect(q).toContain('out center');
  });
});
