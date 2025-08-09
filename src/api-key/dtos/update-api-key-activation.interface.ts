import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateApiKeyActivationDto {
  @IsBoolean()
  isActive: boolean;
}
