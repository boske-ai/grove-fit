import { describe, expect, it } from 'vitest';
import { loadFixtures, runFixture } from './run-fixture.js';

describe('conformance fixtures', () => {
  const fixtures = loadFixtures();

  for (const fixture of fixtures) {
    it(`${fixture.id}: ${fixture.description}`, () => {
      const snapshot = runFixture(fixture);
      expect(snapshot.recommendedTier).toBe(fixture.expected.recommendedTier);
      expect(snapshot.tierFit).toEqual(fixture.expected.tierFit);
    });
  }
});
