import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { Auth } from '../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../iam/authentication/enum/auth-type.enum';
import { ValidateApiKeyDto } from './dtos/validate-api-key.dto';

@Controller('api-key')
@Auth(AuthType.Bearer)
export class ApiKeyConttroller {
  constructor(private readonly apikeyService: ApiKeyService) {}

  @Get()
  async findUserApiKeys(@ActiveUser('sub') ownerId: string) {
    return this.apikeyService.findUserApiKeys(ownerId);
  }

  @Post()
  async createApiKey(@ActiveUser('sub') ownerId: string) {
    return this.apikeyService.createApiKey(ownerId);
  }

  @Get('validate')
  async validateApiKey(@Body() validateApiKeyDto: ValidateApiKeyDto) {
    return this.apikeyService.validateApiKey(validateApiKeyDto);
  }
}
