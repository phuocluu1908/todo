import { CanActivate, ExecutionContext, Injectable, Type, mixin } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export function OrGuard(...guards: Type<CanActivate>[]) {
  @Injectable()
  class OrGuardMixin implements CanActivate {
    constructor(public reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      for (const Guard of guards) {
        const guard = new Guard(this.reflector);
        if (await guard.canActivate(context)) {
          return true;
        }
      }
      return false;
    }
  }
  return mixin(OrGuardMixin);
}