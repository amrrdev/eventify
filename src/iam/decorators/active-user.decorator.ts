import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ActiveUserDate } from '../interfaces/active-user-data.interface';
import { Request } from 'express';
import { REQUEST_USER_KEY } from '../iam.constants';

export const ActiveUser = createParamDecorator((field: keyof ActiveUserDate, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<Request>();
  const user: ActiveUserDate | undefined = request[REQUEST_USER_KEY];
  return field ? user?.[field] : user;
});
