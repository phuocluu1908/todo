import { PipeTransform, Injectable } from '@nestjs/common';

@Injectable()
export class DefaultValuePipe implements PipeTransform {
  constructor(private readonly defaultValue: any) {}

  transform(value: any) {
    return value === undefined || value === null || value === ''
      ? this.defaultValue
      : value;
  }
}
