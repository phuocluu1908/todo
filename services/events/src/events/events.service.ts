import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private pub: any;
  private sub: any;
  private channel: string = process.env.EVENTS_CHANNEL || 'todo-updates';

  onModuleInit() {
    const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    this.pub = new Redis(url);
    this.sub = new Redis(url);
    this.sub.subscribe(this.channel, (err, count) => {
      if (err) {
        this.logger.error('Failed to subscribe to channel', err);
      } else {
        this.logger.log(`Subscribed to ${this.channel} (${count} subscriptions)`);
      }
    });
    this.sub.on('message', (channel, message) => {
      this.logger.log(`Received message on ${channel}: ${message}`);
      try {
        const payload = JSON.parse(message);
        this.handleMessage(channel, payload);
      } catch (e) {
        this.logger.warn('Non-JSON message received');
      }
    });
    this.logger.log('EventsService initialized');
  }

  onModuleDestroy() {
    try {
      this.sub.disconnect();
      this.pub.disconnect();
    } catch (e) {
      // ignore
    }
  }

  async publish(event: string, payload: any) {
    const msg = JSON.stringify({ event, payload, ts: Date.now() });
    await this.pub.publish(this.channel, msg);
    this.logger.log(`Published event=${event}`);
  }

  // Override/extend this to do work for incoming messages
  private async handleMessage(channel: string, payload: any) {
    this.logger.debug(`Handling message ${payload.event}`);
    // Example: forward to internal handlers, enqueue, or call other services
  }
}
