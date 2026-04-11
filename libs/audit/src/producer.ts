import { Kafka, Producer } from 'kafkajs';

export interface ProducerClientOptions {
  brokers?: string[];
  clientId?: string;
  topic?: string;
}

export class ProducerClient {
  private kafka: Kafka;
  private producer: Producer;
  private topic: string;
  // debug info
  private brokers: string[];
  private clientId: string;

  constructor(opts?: ProducerClientOptions) {
    const brokers = opts?.brokers || (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    const clientId = opts?.clientId || process.env.KAFKA_CLIENT_ID || 'todo-producer';
    this.topic = opts?.topic || process.env.AUDIT_TOPIC || 'todo-audit';
    this.kafka = new Kafka({ clientId, brokers });
    this.brokers = brokers;
    this.clientId = clientId;
    this.producer = this.kafka.producer();
  }

  async connect() {
    await this.producer.connect();
    // debug
    // eslint-disable-next-line no-console
    console.log(`[ProducerClient] connected (clientId=${this.clientId}, brokers=${this.brokers.join(',')}, topic=${this.topic})`);
  }

  async disconnect() {
    try {
      await this.producer.disconnect();
      // eslint-disable-next-line no-console
      console.log('[ProducerClient] disconnected');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ProducerClient] disconnect error', err && err.message ? err.message : err);
    }
  }

  async publish(event: string, payload: any) {
    const message = { event, payload, ts: Date.now() };
    await this.producer.send({
      topic: this.topic,
      messages: [{ value: JSON.stringify(message) }],
    });
    // eslint-disable-next-line no-console
    console.log(`[ProducerClient] published event=${event} to topic=${this.topic}`);
  }
}

export async function createAndPublish(event: string, payload: any, opts?: ProducerClientOptions) {
  const client = new ProducerClient(opts);
  try {
    await client.connect();
    await client.publish(event, payload);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[createAndPublish] error publishing', err && err.message ? err.message : err);
    throw err;
  } finally {
    await client.disconnect();
  }
}
