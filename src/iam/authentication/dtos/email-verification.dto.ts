import { IsEmail, IsNotEmpty } from 'class-validator';

export class EmailVerificationDto {
  @IsNotEmpty()
  otp: string;

  @IsEmail()
  email: string;
}
