export function cohortLabel(code: string) {
  const c = (code || "").trim();
  const m = c.match(/^cohort[-_\s]?(\d+)$/i);
  if (m) return `Cohort ${m[1]}`;
  const m2 = c.match(/^cohort[-_\s]?(\d+)$/i);
  if (m2) return `Cohort ${m2[1]}`;
  return c;
}
