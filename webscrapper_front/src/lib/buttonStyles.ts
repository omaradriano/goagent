// Variante "outline" de los botones de Animate UI adaptada al tema de la web:
// el outline de shadcn usa bg-background (blanco fijo) y en modo oscuro se
// veria como un bloque blanco. Usa las variables --ga-* del GlobalStyle.
export const themedOutlineButton =
  "border-[var(--ga-surface-border)] bg-transparent text-[var(--ga-text)] hover:bg-[var(--ga-surface-soft)] hover:text-[var(--ga-text)]";
