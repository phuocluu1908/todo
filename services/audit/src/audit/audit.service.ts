import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer, Consumer } from 'kafkajs';
import fs from 'fs';
import path from 'path';
import Ajv, { ValidateFunction } from 'ajv';
import Database from 'better-sqlite3';
import { auditSchema } from './schema';

@Injectable()
export class AuditService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditService.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private topic = process.env.AUDIT_TOPIC || 'todo-audit';
  private validateFn: ValidateFunction | null = null;
  private db: any = null;
  private insertStmt: any = null;

  async onModuleInit() {
    const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    const clientId = process.env.KAFKA_CLIENT_ID || 'todo-audit';
    this.kafka = new Kafka({ clientId, brokers });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: `${clientId}-group` });
    // Attempt to connect to Kafka with retries so service doesn't crash if Kafka
    // is still starting. Retry for a short period before giving up.
    const maxAttempts = 12; // ~1 minute with 5s delay
    let attempt = 0;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    let connected = false;
    while (attempt < maxAttempts && !connected) {
      try {
        await this.producer.connect();
        await this.consumer.connect();
        connected = true;
      } catch (e) {
        attempt += 1;
        this.logger.warn(`Kafka connect attempt ${attempt} failed, retrying...`);
        await sleep(5000);
      }
    }

    if (!connected) {
      this.logger.error('Failed to connect to Kafka after multiple attempts; continuing without Kafka');
    } else {
      await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });

      this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const msg = message.value?.toString();
        this.logger.log(`Consumed message on ${topic}: ${msg}`);
        try {
          const payload = msg ? JSON.parse(msg) : null;
          await this.handleMessage(payload);
        } catch (e) {
          this.logger.warn('Invalid message JSON');
        }
      },
    });

      this.logger.log('AuditService initialized and connected to Kafka');
    }

    // Compile AJV validator once for reuse
    try {
      const ajv = new Ajv();
      this.validateFn = ajv.compile(auditSchema as object);
    } catch (e) {
      this.logger.error('Failed to compile audit schema', e instanceof Error ? e.stack : String(e));
      this.validateFn = null;
    }

    // Ensure data dir exists and open sqlite DB
    try {
      const dataDir = path.resolve(process.cwd(), 'services', 'audit', 'data');
      await fs.promises.mkdir(dataDir, { recursive: true });
      const dbPath = path.join(dataDir, 'audits.db');
      this.db = new Database(dbPath);
      // Create table if not exists
      this.db.prepare(
        'CREATE TABLE IF NOT EXISTS audits (id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, payload TEXT, ts INTEGER NOT NULL)'
      ).run();
      this.insertStmt = this.db.prepare('INSERT INTO audits (event, payload, ts) VALUES (?, ?, ?)');
      this.logger.log(`Opened audit DB at ${dbPath}`);
    } catch (e) {
      this.logger.error('Failed to open audit DB', e instanceof Error ? e.stack : String(e));
    }
  }

  async onModuleDestroy() {
    try {
      await this.consumer.disconnect();
      await this.producer.disconnect();
      if (this.db) {
        try {
          this.db.close();
        } catch (e) {
          // ignore
        }
      }
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
  private async handleMessage(payload: any) {
    this.logger.debug(`Handle message: ${JSON.stringify(payload)}`);
    try {
      if (!this.validateFn) {
        this.logger.warn('No validator available; skipping validation');
      } else {
        const valid = this.validateFn(payload);
        if (!valid) {
          this.logger.warn(`Audit message failed schema validation: ${JSON.stringify(this.validateFn.errors)}`);
          return;
        }
      }

      // Persist to SQLite DB
      if (this.insertStmt) {
        try {
          this.insertStmt.run(payload.event, JSON.stringify(payload.payload ?? null), payload.ts);
          this.logger.log('Persisted audit message to DB');
        } catch (e) {
          this.logger.error('Failed to insert audit into DB', e instanceof Error ? e.stack : String(e));
        }
      } else {
        this.logger.warn('No DB statement available; skipping DB persist');
      }
    } catch (e) {
      this.logger.error('Failed to persist audit message', e instanceof Error ? e.stack : String(e));
    }
  }
}
