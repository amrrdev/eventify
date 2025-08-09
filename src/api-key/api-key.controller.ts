import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { Auth } from '../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../iam/authentication/enum/auth-type.enum';
import { ValidateApiKeyDto } from './dtos/validate-api-key.dto';
import { UpdateApiKeyActivationDto } from './dtos/update-api-key-activation.interface';

@Controller('api-key')
@Auth(AuthType.Bearer)
export class ApiKeyConttroller {
  constructor(private readonly apikeyService: ApiKeyService) {}

  @Get()
  async findUserApiKeys(@ActiveUser('sub') ownerId: string) {
    return this.apikeyService.findUserApiKeys(ownerId);
  }

  @Post()
  async createApiKey(@ActiveUser('sub') ownerId: string, @Body('name') name: string) {
    return this.apikeyService.createApiKey(ownerId, name);
  }

  @Get('validate')
  async validateApiKey(@Body() validateApiKeyDto: ValidateApiKeyDto) {
    return this.apikeyService.validateApiKey(validateApiKeyDto);
  }

  @Delete(':key')
  async deleteApiKey(@ActiveUser('sub') ownerId: string, @Param('key') key: string) {
    return this.apikeyService.deleteApiKey(ownerId, key);
  }

  @Patch(':key')
  async updateApiKeyActivation(
    @ActiveUser('sub') ownerId: string,
    @Param('key') key: string,
    @Body() updateApiKeyActivationDto: UpdateApiKeyActivationDto,
  ) {
    return this.apikeyService.updateApiKeyActivation(ownerId, key, updateApiKeyActivationDto);
  }
}
