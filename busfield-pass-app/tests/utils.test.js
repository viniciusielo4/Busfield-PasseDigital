import { formatBRL, parseToCents } from '../src/utils/money';
import { formatDateTime, currentMonthRange, dayLabel, timeLabel } from '../src/utils/date';
import { initials } from '../src/utils/text';
import { isEmail, passwordError } from '../src/utils/validation';
import { errorMessage } from '../src/utils/errors';

describe('money', () => {
  test('formatBRL formata centavos em reais', () => {
    expect(formatBRL(0)).toBe('R$ 0,00');
    expect(formatBRL(450)).toBe('R$ 4,50');
    expect(formatBRL(2050)).toBe('R$ 20,50');
    expect(formatBRL(123456789)).toBe('R$ 1.234.567,89');
    expect(formatBRL(undefined)).toBe('R$ 0,00');
  });
  test('parseToCents aceita vírgula, ponto de milhar e prefixo R$', () => {
    expect(parseToCents('25')).toBe(2500);
    expect(parseToCents('25,5')).toBe(2550);
    expect(parseToCents('R$ 12,05')).toBe(1205);
    expect(parseToCents('1.000,00')).toBe(100000);
  });
  test('parseToCents rejeita valores inválidos', () => {
    expect(parseToCents('')).toBeNull();
    expect(parseToCents('abc')).toBeNull();
    expect(parseToCents('1,234')).toBeNull();
    expect(parseToCents('-5')).toBe(500); // o sinal é descartado; o limite mínimo é validado à parte
  });
});

describe('date', () => {
  const now = new Date(2026, 10, 4, 12, 0);
  test('hoje, ontem e data completa', () => {
    expect(formatDateTime(new Date(2026, 10, 4, 7, 42).toISOString(), now)).toBe('Hoje, 07:42');
    expect(formatDateTime(new Date(2026, 10, 3, 18, 10).toISOString(), now)).toBe('Ontem, 18:10');
    expect(formatDateTime(new Date(2026, 9, 20, 9, 5).toISOString(), now)).toBe('20/10/2026, 09:05');
    expect(formatDateTime('lixo', now)).toBe('');
  });
  test('dayLabel agrupa por dia', () => {
    expect(dayLabel(new Date(2026, 10, 4, 7, 42).toISOString(), now)).toBe('Hoje');
    expect(dayLabel(new Date(2026, 10, 3, 18, 10).toISOString(), now)).toBe('Ontem');
    expect(dayLabel(new Date(2026, 9, 20, 9, 5).toISOString(), now)).toBe('20 de outubro');
    expect(dayLabel(new Date(2025, 0, 2, 9, 5).toISOString(), now)).toBe('2 de janeiro de 2025');
    expect(timeLabel(new Date(2026, 10, 4, 7, 5).toISOString())).toBe('07:05');
  });
  test('currentMonthRange cobre o mês atual', () => {
    const r = currentMonthRange(now);
    expect(new Date(r.from).getMonth()).toBe(10);
    expect(new Date(r.to).getMonth()).toBe(11);
  });
});

describe('validation', () => {
  test('e-mail', () => {
    expect(isEmail('a@b.com')).toBe(true);
    expect(isEmail(' a@b.com ')).toBe(true);
    expect(isEmail('a@b')).toBe(false);
    expect(isEmail('sem-arroba')).toBe(false);
  });
  test('senha (8 a 72 caracteres)', () => {
    expect(passwordError('1234567')).toMatch(/mínimo/);
    expect(passwordError('12345678')).toBeNull();
    expect(passwordError('x'.repeat(73))).toMatch(/máximo/);
  });
  test('errorMessage usa o primeiro detalhe de validação', () => {
    expect(errorMessage({ code: 'VALIDATION_ERROR', message: 'Dados inválidos.', details: [{ message: 'E-mail inválido.' }] })).toBe('E-mail inválido.');
    expect(errorMessage({ message: 'Oi' })).toBe('Oi');
  });
});

describe('text', () => {
  test('initials usa primeira e última inicial', () => {
    expect(initials('Vinicius Ielo Martins')).toBe('VM');
    expect(initials('Ana')).toBe('A');
    expect(initials('  ')).toBe('?');
  });
});
