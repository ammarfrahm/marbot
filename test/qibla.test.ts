import { describe, expect, it } from 'vitest';
import { qiblaBearing, turnTo } from '../src/lib/qibla';

describe('qiblaBearing', () => {
  it("gives Jakarta's published 295°09'", () => {
    expect(qiblaBearing(-6.1754, 106.8272)).toBeCloseTo(295 + 9 / 60, 1);
  });

  it('points due north from due south of the Kaaba', () => {
    expect(qiblaBearing(0, 39.826206)).toBeCloseTo(0, 6);
  });
});

describe('turnTo', () => {
  it('takes the short way round', () => {
    expect(turnTo(0, 295)).toBeCloseTo(-65);
    expect(turnTo(350, 10)).toBeCloseTo(20);
    expect(turnTo(10, 350)).toBeCloseTo(-20);
    expect(turnTo(295, 295)).toBeCloseTo(0);
    expect(turnTo(0, 180)).toBeCloseTo(180);
  });
});
