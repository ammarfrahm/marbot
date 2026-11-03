import { describe, expect, it } from 'vitest';
import { monthStep } from '../src/lib/keys';

const press = (key: string, extra: Record<string, unknown> = {}) =>
  monthStep({ key, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, defaultPrevented: false, target: { tagName: 'BODY' }, ...extra });

describe('monthStep', () => {
  it('pages back and forward', () => {
    expect(press('ArrowLeft')).toBe(-1);
    expect(press('ArrowRight')).toBe(1);
  });
  it('ignores other keys', () => expect(press('ArrowUp')).toBe(0));
  it('leaves arrows alone inside form controls', () => {
    for (const tagName of ['INPUT', 'SELECT', 'TEXTAREA']) expect(press('ArrowLeft', { target: { tagName } })).toBe(0);
    expect(press('ArrowLeft', { target: { tagName: 'DIV', isContentEditable: true } })).toBe(0);
  });
  it('leaves browser shortcuts alone', () => {
    for (const mod of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey']) expect(press('ArrowLeft', { [mod]: true })).toBe(0);
  });
  it('respects a handled key', () => expect(press('ArrowRight', { defaultPrevented: true })).toBe(0));
  it('works with a button focused', () => expect(press('ArrowRight', { target: { tagName: 'BUTTON' } })).toBe(1));
});
