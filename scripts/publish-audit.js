const { Kafka } = require('kafkajs');

(async () => {
  const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
  const kafka = new Kafka({ clientId: 'todo-cli-publisher', brokers });
  const producer = kafka.producer();
  try {
    await producer.connect();
    const message = { event: 'test.event', payload: { msg: 'hello from script' }, ts: Date.now() };
    await producer.send({ topic: process.env.AUDIT_TOPIC || 'todo-audit', messages: [{ value: JSON.stringify(message) }] });
    console.log('published test.event');
  } catch (err) {
    console.error('publish failed', err && err.message ? err.message : err);
    process.exit(1);
  } finally {
    await producer.disconnect();
  }
})();
