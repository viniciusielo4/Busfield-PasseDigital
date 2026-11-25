// Converte qualquer erro em texto amigável para a tela.
export function errorMessage(err) {
  if (!err) return '';
  if (err.code === 'VALIDATION_ERROR' && err.details?.length) return err.details[0].message;
  return err.message || 'Ocorreu um erro inesperado.';
}
