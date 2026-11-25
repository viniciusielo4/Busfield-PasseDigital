// Registra ações sensíveis na trilha de auditoria (dentro da transação do chamador).
async function audit(client, { actorUserId, action, entity, entityId, metadata = {} }) {
  await client.query(
    'INSERT INTO audit_logs (actor_user_id, action, entity, entity_id, metadata) VALUES ($1, $2, $3, $4, $5)',
    [actorUserId, action, entity, entityId, JSON.stringify(metadata)]
  );
}
module.exports = { audit };
