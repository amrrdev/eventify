import { SetMetadata } from '@nestjs/common';
import { AuthType } from '../enum/auth-type.enum';
import { AUTH_TYPE_KEY } from '../../iam.constants';

export const Auth = (...authType: AuthType[]) => SetMetadata(AUTH_TYPE_KEY, authType);
