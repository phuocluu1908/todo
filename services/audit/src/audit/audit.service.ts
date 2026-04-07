import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer, Consumer } from 'kafkajs';

@Injectable()
export class AuditService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditService.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private topic = process.env.AUDIT_TOPIC || 'todo-audit';

  async onModuleInit() {
    const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    const clientId = process.env.KAFKA_CLIENT_ID || 'todo-audit';
    this.kafka = new Kafka({ clientId, brokers });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: `${clientId}-group` });

    await this.producer.connect();
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });

    this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const msg = message.value?.toString();
        this.logger.log(`Consumed message on ${topic}: ${msg}`);
        try {
          const payload = msg ? JSON.parse(msg) : null;
          this.handleMessage(payload);
        } catch (e) {
          this.logger.warn('Invalid message JSON');
        }
      },
    });

    this.logger.log('AuditService initialized and connected to Kafka');
  }

  async onModuleDestroy() {
    try {
      await this.consumer.disconnect();
      await this.producer.disconnect();
    } catch (e) {
      // ignore
    }
  }

  async publish(event: string, payload: any) {
    const message = { event, payload, ts: Date.now() };
    await this.producer.send({ topic: this.topic, messages: [{ value: JSON.stringify(message) }] });
    this.logger.log(`Published audit event=${event}`);
  }

  // extend with actual handlers
  private handleMessage(payload: any) {
    this.logger.debug(`Handle message: ${JSON.stringify(payload)}`);
    // e.g., persist to DB, forward to analytics, etc.
  }
}
