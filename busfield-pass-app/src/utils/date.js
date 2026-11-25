const pad = (n) => String(n).padStart(2, '0');
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// "Hoje, 07:42" · "Ontem, 18:10" · "03/11/2026, 09:05"
export function formatDateTime(iso, now = new Date()) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (sameDay(d, now)) return `Hoje, ${time}`;
  if (sameDay(d, yesterday)) return `Ontem, ${time}`;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${time}`;
}

// Início do mês atual e do próximo, em ISO, para filtrar o resumo do mês.
export function currentMonthRange(now = new Date()) {
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
  };
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// Rótulo do dia para agrupar o histórico: "Hoje" · "Ontem" · "3 de novembro" · "3 de novembro de 2025"
export function dayLabel(iso, now = new Date()) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (sameDay(d, now)) return 'Hoje';
  if (sameDay(d, yesterday)) return 'Ontem';
  const base = `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} de ${d.getFullYear()}`;
}

export function timeLabel(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
