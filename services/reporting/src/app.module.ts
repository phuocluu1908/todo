import { Module } from '@nestjs/common';
import { ReportingModule } from './reporting/reporting.module';

@Module({
  imports: [ReportingModule],
})
export class AppModule {}
