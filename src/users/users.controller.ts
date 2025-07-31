import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { Auth } from '../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../iam/authentication/enum/auth-type.enum';
import { ActiveUser } from '../iam/decorators/active-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Get()
  @Auth(AuthType.None)
  async getAll(@ActiveUser('sub') sub: string) {
    return this.usersService.foo();
  }
}
