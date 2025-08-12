import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { SignUpDto } from './dtos/sign-up.dto';
import { SignInDto } from './dtos/sign-in.dto';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { EmailVerificationDto } from './dtos/email-verification.dto';
import { ResendOtpDto } from './dtos/resend-otp.dto';
import { Auth } from './decorators/auth.decorator';
import { AuthType } from './enum/auth-type.enum';
import { Request, Response } from 'express';

@Controller('auth')
@Auth(AuthType.None)
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @Post('sign-up')
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authenticationService.singUp(signUpDto);
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() signInDto: SignInDto, @Res({ passthrough: true }) response: Response) {
    const { accessToken, refreshToken } = await this.authenticationService.singIn(signInDto);
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken, refreshToken };
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = request.cookies.refreshToken;
    if (!refreshToken) {
      throw new BadRequestException('Refresh token not found');
    }

    // This returns { accessToken, refreshToken } with new tokens
    const result = await this.authenticationService.refreshToken({ refreshToken });

    // CRITICAL: Update the HTTP-only cookie with the new refresh token
    response.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Only return the access token (refresh token is in HTTP-only cookie)
    return { accessToken: result.accessToken };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() emailVerificationDto: EmailVerificationDto) {
    return this.authenticationService.verifyEmail(emailVerificationDto);
  }

  @Post('otp/resend')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.authenticationService.resendOtp(resendOtpDto);
  }
}
