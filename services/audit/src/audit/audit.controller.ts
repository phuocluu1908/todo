import { Body, Controller, Post } from '@nestjs/common';
import { AuditService } from './audit.service';

class PublishDto {
  event: string;
  payload: any;
}

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Post('publish')
  async publish(@Body() body: PublishDto) {
    console.log('AuditController.publish body=', JSON.stringify(body));
    if (!body || !body.event) {
      console.warn('AuditController.publish: missing event in body', body);
      return { ok: false, error: 'missing event' };
    }
    await this.audit.publish(body.event, body.payload);
    return { ok: true };
  }
}
