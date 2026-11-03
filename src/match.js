const norm = (s) =>
  String(s).toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').replace(/\s+/g, ' ');

const plurals = (f) => [f, f + 's', f + 'es', ...(/[^aeiou\W\d_]y$/.test(f) ? [f.slice(0, -1) + 'ies'] : [])];

export function isCorrect(guess, item) {
  const g = norm(guess);
  if (!g) return false;
  return [item.name, ...(item.answers ?? [])].some((a) => {
    const f = norm(a);
    return f !== '' && plurals(f).includes(g);
  });
}
