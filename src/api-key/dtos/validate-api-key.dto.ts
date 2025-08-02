import { IsNotEmpty } from 'class-validator';

export class ValidateApiKeyDto {
  @IsNotEmpty()
  apiKey: string;
}
