import { describe, expect, it } from 'vitest';
import { announceTurn, qiblaBearing, turnTo } from '../src/lib/qibla';

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

describe('announceTurn', () => {
  it('speaks alignment at once, but only once', () => {
    const a = announceTurn(null, 1, true, 0);
    expect(a.say).toBe('Sudah menghadap kiblat');
    expect(announceTurn(a.next, 2, true, 10).say).toBeNull();
  });

  it('throttles turn guidance to 10° steps every 2 s', () => {
    const a = announceTurn(null, 40, false, 0);
    expect(a.say).toBe('Putar ke kanan 40°');
    expect(announceTurn(a.next, 20, false, 500).say).toBeNull(); // too soon
    expect(announceTurn(a.next, 35, false, 3000).say).toBeNull(); // too small a move
    expect(announceTurn(a.next, 20, false, 3000).say).toBe('Putar ke kanan 20°');
    expect(announceTurn(a.next, -30, false, 3000).say).toBe('Putar ke kiri 30°');
  });

  it('speaks again when leaving alignment', () => {
    const aligned = announceTurn(null, 0, true, 0).next;
    expect(announceTurn(aligned, -12, false, 100).say).toBe('Putar ke kiri 10°');
  });
});
