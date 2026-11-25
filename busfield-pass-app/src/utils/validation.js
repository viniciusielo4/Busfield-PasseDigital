export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());

// Retorna a mensagem de erro da senha ou null se estiver ok (mesma regra do backend: 8 a 72 caracteres).
export function passwordError(v) {
  if (!v || v.length < 8) return 'A senha deve ter no mínimo 8 caracteres.';
  if (v.length > 72) return 'A senha deve ter no máximo 72 caracteres.';
  return null;
}
