/** An element by id; the caller knows it exists and names its type. */
export const $ = <T extends Element = HTMLElement>(id: string) => document.getElementById(id) as unknown as T;

/** Writes only real changes: live regions and layout would otherwise react to identical text. */
export const setText = (id: string, text: string) => {
  const el = document.getElementById(id)!;
  if (el.textContent !== text) el.textContent = text;
};
