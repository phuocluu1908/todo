export const auditSchema = {
  type: 'object',
  properties: {
    event: { type: 'string' },
    payload: { type: ['object', 'null'] },
    ts: { type: 'number' },
  },
  required: ['event', 'ts'],
  additionalProperties: true,
};
