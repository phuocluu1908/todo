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

  constructor(opts?: ProducerClientOptions) {
    const brokers = opts?.brokers || (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    const clientId = opts?.clientId || process.env.KAFKA_CLIENT_ID || 'todo-producer';
    this.topic = opts?.topic || process.env.AUDIT_TOPIC || 'todo-audit';
    this.kafka = new Kafka({ clientId, brokers });
    this.producer = this.kafka.producer();
  }

  async connect() {
    await this.producer.connect();
  }

  async disconnect() {
    await this.producer.disconnect();
  }

  async publish(event: string, payload: any) {
    const message = { event, payload, ts: Date.now() };
    await this.producer.send({
      topic: this.topic,
      messages: [{ value: JSON.stringify(message) }],
    });
  }
}

export async function createAndPublish(event: string, payload: any, opts?: ProducerClientOptions) {
  const client = new ProducerClient(opts);
  try {
    await client.connect();
    await client.publish(event, payload);
  } finally {
    await client.disconnect();
  }
}
