// Converte centavos (inteiro) em "R$ 1.234,50".
export function formatBRL(cents) {
  const n = Math.round(Number(cents) || 0);
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const reais = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const centavos = String(abs % 100).padStart(2, '0');
  return `${sign}R$ ${reais},${centavos}`;
}

// Converte texto digitado ("12,50", "R$ 12,5") em centavos. Retorna null se inválido.
export function parseToCents(text) {
  const cleaned = String(text).replace(/[^\d,.]/g, '').replace(/\./g, '');
  if (!/^\d+(,\d{1,2})?$/.test(cleaned)) return null;
  const [r, c = ''] = cleaned.split(',');
  return Number(r) * 100 + Number(c.padEnd(2, '0'));
}
