export function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export function formatDateToBR(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}
