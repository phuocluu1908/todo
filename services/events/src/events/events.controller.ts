import { Body, Controller, Post } from '@nestjs/common';
import { EventsService } from './events.service';

class PublishDto {
  event: string;
  payload: any;
}

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post('publish')
  async publish(@Body() body: PublishDto) {
    await this.events.publish(body.event, body.payload);
    return { ok: true };
  }
}
