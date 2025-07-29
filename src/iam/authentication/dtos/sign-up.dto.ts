import { IsEmail, MinLength } from 'class-validator';

export class SignUpDto {
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;
}
