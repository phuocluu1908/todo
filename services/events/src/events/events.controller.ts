import { Body, Controller, Post } from '@nestjs/common';
import { EventsService } from './events.service';
import { Allow, IsNotEmpty, IsString } from 'class-validator';

class PublishDto {
  @IsString()
  @IsNotEmpty()
  event: string;

  @Allow()
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
