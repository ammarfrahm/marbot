/** Writes only real changes: live regions and layout would otherwise react to identical text. */
export const setText = (id: string, text: string) => {
  const el = document.getElementById(id)!;
  if (el.textContent !== text) el.textContent = text;
};
