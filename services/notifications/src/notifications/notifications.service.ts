import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { Cron } from '@nestjs/schedule';
import * as nodemailer from 'nodemailer';

interface NotificationPayload {
  userId?: number | null;
  userEmail?: string;
  channel: 'email' | 'push' | 'log' | 'webhook';
  message: string;
  subject?: string;
  webhookUrl?: string;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly todoApi = process.env.TODO_API_URL || 'http://localhost:3000/api';
  private transporter: any;

  onModuleInit() {
    this.logger.log('NotificationsService initialized');
    this.initializeEmailTransporter();
  }

  private initializeEmailTransporter() {
    // Initialize Nodemailer - configure based on environment
    const smtpConfig = process.env.SMTP_HOST
      ? {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        }
      : {
          // Fallback to test account if no config provided
          host: 'localhost',
          port: 1025,
          secure: false,
        };

    this.transporter = nodemailer.createTransport(smtpConfig);
    this.logger.log('Email transporter initialized');
  }

  async notify(payload: NotificationPayload) {
    this.logger.log(
      `Notify user=${payload.userId} email=${payload.userEmail} channel=${payload.channel} msg="${payload.message}"`,
    );

    try {
      switch (payload.channel) {
        case 'email':
          return await this.sendEmail(payload);
        case 'push':
          return await this.sendPush(payload);
        case 'webhook':
          return await this.sendWebhook(payload);
        case 'log':
        default:
          return { ok: true, message: 'Logged notification' };
      }
    } catch (error) {
      this.logger.error(
        `Failed to send ${payload.channel} notification`,
        error instanceof Error ? error.stack : String(error),
      );
      return { ok: false, error: 'Failed to send notification' };
    }
  }

  private async sendEmail(payload: NotificationPayload) {
    if (!payload.userEmail) {
      this.logger.warn('No email address provided for email notification');
      return { ok: false, error: 'No email address' };
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@todoapp.com',
      to: payload.userEmail,
      subject: payload.subject || 'Todo Reminder',
      html: `
        <h2>${payload.subject || 'Todo Reminder'}</h2>
        <p>${payload.message}</p>
        <hr />
        <p><small>This is an automated message from Todo App</small></p>
      `,
      text: payload.message,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent: ${info.messageId}`);
      return { ok: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error('Email send failed', error instanceof Error ? error.stack : String(error));
      throw error;
    }
  }

  private async sendPush(payload: NotificationPayload) {
    // Placeholder for push notification implementation
    // Can be integrated with Firebase Cloud Messaging, OneSignal, etc.
    this.logger.log(`Push notification queued: ${payload.message}`);
    return { ok: true, queued: true };
  }

  private async sendWebhook(payload: NotificationPayload) {
    if (!payload.webhookUrl) {
      this.logger.warn('No webhook URL provided');
      return { ok: false, error: 'No webhook URL' };
    }

    try {
      const response = await axios.post(payload.webhookUrl, {
        timestamp: new Date().toISOString(),
        userId: payload.userId,
        channel: payload.channel,
        message: payload.message,
        subject: payload.subject,
      });
      this.logger.log(`Webhook delivered: ${payload.webhookUrl}`);
      return { ok: true, webhookDelivered: true };
    } catch (error) {
      this.logger.error(
        `Webhook delivery failed: ${payload.webhookUrl}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  // @ts-ignore - TypeScript decorator signature mismatch with @nestjs/schedule
  @Cron(process.env.POLL_CRON || '*/5 * * * *')
  async handleCron() {
    this.logger.debug('Running scheduled reminder scan');
    await this.scanAndNotify();
  }

  private async scanAndNotify() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      
      // Scan for todos due today and tomorrow
      const res = await axios.get(`${this.todoApi}/todos?dueFrom=${today}&dueTo=${tomorrow}`);
      const todos = res.data?.data || res.data || [];
      
      if (Array.isArray(todos) && todos.length) {
        for (const todo of todos) {
          const msg = `Reminder: "${todo.title}" is due on ${todo.dueDate}`;
          const payload: NotificationPayload = {
            userId: todo.userId || null,
            userEmail: todo.userEmail,
            channel: process.env.DEFAULT_NOTIFICATION_CHANNEL as any || 'log',
            message: msg,
            subject: `Todo Reminder: ${todo.title}`,
          };
          
          await this.notify(payload);
        }
      }
    } catch (err) {
      this.logger.error('scanAndNotify error', err instanceof Error ? err.stack : String(err));
    }
  }
}
