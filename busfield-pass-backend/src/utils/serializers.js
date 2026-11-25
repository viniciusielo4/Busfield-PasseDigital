const toUser = (r) => ({ id: r.id, name: r.name, email: r.email, role: r.role, createdAt: r.created_at });
const toCard = (r) => ({
  id: r.id, cardNumber: r.card_number, status: r.status,
  ...(r.balance_cents !== undefined && { balanceCents: Number(r.balance_cents) }),
});
const toTransaction = (r) => ({
  id: r.id, type: r.type, amountCents: Number(r.amount_cents),
  balanceAfterCents: Number(r.balance_after_cents), description: r.description,
  isSimulated: r.is_simulated, createdAt: r.created_at,
  ...(r.card_number && { cardNumber: r.card_number }),
});
module.exports = { toUser, toCard, toTransaction };
