type KeyEvent = {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  defaultPrevented: boolean;
  target: EventTarget | { tagName?: string; isContentEditable?: boolean } | null;
};

const FORM_CONTROLS = ['INPUT', 'SELECT', 'TEXTAREA'];

/** ← is -1 and → is 1 when pressed on its own outside a form control (arrows move the caret and options there); else 0. */
export function monthStep(e: KeyEvent): -1 | 0 | 1 {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return 0;
  const target = e.target as { tagName?: string; isContentEditable?: boolean } | null;
  if (target?.isContentEditable || FORM_CONTROLS.includes(target?.tagName ?? '')) return 0;
  return e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
}
