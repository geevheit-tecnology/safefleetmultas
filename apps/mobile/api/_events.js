async function recordOutboxEvent(client, { organizationId, aggregateType = "regulatory_case", aggregateId, eventType, payload = {} }) {
  await client.query(
    `
    insert into event_outbox (organization_id, aggregate_type, aggregate_id, event_type, payload)
    values ($1, $2, $3, $4, $5::jsonb)
    `,
    [organizationId, aggregateType, aggregateId, eventType, JSON.stringify(payload)]
  );
}

module.exports = { recordOutboxEvent };
