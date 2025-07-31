import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRepository } from '../../users/repository/user.repository';
import { HashingService } from '../hashing/hashing.service';
import { SignUpDto } from './dtos/sign-up.dto';
import { SignInDto } from './dtos/sign-in.dto';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from '../config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { User } from '../../users/schemas/user.schema';
import { ActiveUserDate } from './interfaces/active-user-data.interface';
import { randomUUID } from 'node:crypto';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { RedisService } from '../../integrations/redis/redis.service';
import { InjectQueue } from '@nestjs/bullmq';
import { NOTIFICATION_QUEUE } from '../../integrations/notification/notification.constants';
import { Queue } from 'bullmq';
import { SEND_NOTIFICATION } from '../iam.constants';
import { generateVerifyAccountEmailTemplate } from '../email-templates/verify-email.templete';
import * as crypto from 'node:crypto';
import { EmailVerificationDto } from './dtos/email-verification.dto';
import { ResendOtpDto } from './dtos/resend-otp.dto';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashingService: HashingService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    @InjectQueue(NOTIFICATION_QUEUE) private readonly notificationQueue: Queue,
    @Inject(jwtConfig.KEY) private readonly jwtConfigrations: ConfigType<typeof jwtConfig>,
  ) {}

  async singUp(signUpDto: SignUpDto) {
    const existingUser = await this.userRepository.findByEmail(signUpDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const { password, ...userData } = signUpDto;
    const hashedPassword = await this.hashingService.hash(password);
    const newUser = await this.userRepository.createUser({ ...userData, password: hashedPassword });

    const { otp, hashedOtp } = this.generateFullOtp();
    await this.redisService.setOtp(newUser.email, hashedOtp);

    await this.notificationQueue.add(SEND_NOTIFICATION, {
      to: newUser.email,
      ...generateVerifyAccountEmailTemplate(newUser.name, otp),
    });

    return newUser;
  }

  async resendOtp(resendOtpDto: ResendOtpDto) {
    const user = await this.userRepository.findByEmail(resendOtpDto.email);
    if (!user) {
      throw new NotFoundException('No account found with this email address');
    }

    if (user.isEmailVerified) {
      return { message: 'Email is already verified' };
    }

    const haveValidOtp = await this.redisService.getOtp(resendOtpDto.email);
    if (haveValidOtp) {
      await this.redisService.invalidateOtp(resendOtpDto.email);
    }

    const { otp, hashedOtp } = this.generateFullOtp();
    await Promise.all([
      this.redisService.setOtp(user.email, hashedOtp),
      this.notificationQueue.add(SEND_NOTIFICATION, {
        to: user.email,
        ...generateVerifyAccountEmailTemplate(user.name, otp),
      }),
    ]);

    return {
      message: 'Verification code sent successfully',
      email: user.email,
    };
  }

  async verifyEmail(emailVerificationDto: EmailVerificationDto) {
    const user = await this.userRepository.findByEmail(emailVerificationDto.email);
    if (!user) {
      throw new NotFoundException('No account found with this email address');
    }

    if (user.isEmailVerified) {
      return { message: 'Email is already verified' };
    }

    const storedHashedOtp = await this.redisService.getOtp(user.email);
    if (!storedHashedOtp) {
      throw new UnauthorizedException('Verification code has expired. Please request a new one');
    }

    const hashedOtpClient = this.generateOtpHash(emailVerificationDto.otp);
    if (hashedOtpClient !== storedHashedOtp) {
      throw new UnauthorizedException('Invalid verification code. Please check and try again');
    }

    await Promise.all([
      await this.redisService.invalidateOtp(emailVerificationDto.email),
      await this.userRepository.updateEmailVerificationStatus(user.email, true),
    ]);

    return {
      message: 'Email verified successfully',
      verified: true,
    };
  }

  async singIn(signInDto: SignInDto) {
    const existingUser = await this.userRepository.findByEmail(signInDto.email);
    if (!existingUser || !(await this.hashingService.compare(signInDto.password, existingUser.password))) {
      throw new ConflictException('Invalid email or password');
    }

    if (!existingUser.isEmailVerified) {
      throw new UnauthorizedException(
        'Email verification required. Please check your email and enter the verification code to access your account.',
      );
    }
    return await this.generateTokens(existingUser);
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      const { sub, refreshTokenId } = await this.jwtService.verifyAsync<
        Pick<ActiveUserDate, 'sub'> & { refreshTokenId: string }
      >(refreshTokenDto.refreshToken, {
        issuer: this.jwtConfigrations.issuer,
        secret: this.jwtConfigrations.secret,
        audience: this.jwtConfigrations.audience,
      });

      const user = await this.userRepository.findById(sub);
      if (!user) {
        throw new BadRequestException('we can not find a user with this refresh token');
      }

      const isVaild = await this.redisService.validate(user._id as string, refreshTokenId);
      if (!isVaild) {
        throw new UnauthorizedException('Refresh token is invalid');
      }

      await this.redisService.inValidate(user._id as string);
      return this.generateTokens(user);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  private generateFullOtp(): { otp: string; hashedOtp: string } {
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = this.generateOtpHash(otp);
    return { otp, hashedOtp };
  }

  private generateOtpHash(otp: string) {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshTokenId = randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this.signToken<Partial<ActiveUserDate>>(user._id as string, this.jwtConfigrations.accessTokenTtl, {
        email: user.email,
        role: user.role || 'user',
      }),

      this.signToken(user._id as string, this.jwtConfigrations.refreshTokenTtl, {
        refreshTokenId,
      }),
    ]);

    await this.redisService.insert(user._id as string, refreshTokenId);

    return {
      accessToken,
      refreshToken,
    };
  }

  private signToken<T>(userId: string, expiresIn: number, payload?: T) {
    return this.jwtService.signAsync(
      {
        sub: userId,
        ...payload,
      },
      {
        secret: this.jwtConfigrations.secret,
        audience: this.jwtConfigrations.audience,
        issuer: this.jwtConfigrations.issuer,
        expiresIn,
      },
    );
  }
}
