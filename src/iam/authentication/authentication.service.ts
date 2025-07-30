import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
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
import { NotificationService } from '../../integrations/notification/notification.service';

@Injectable()
export class AuthenticationService {
  static nofr = 0;
  static comp = 0;
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashingService: HashingService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly notificationService: NotificationService,
    @Inject(jwtConfig.KEY) private readonly jwtConfigrations: ConfigType<typeof jwtConfig>,
  ) {}

  async singUp(signUpDto: SignUpDto) {
    const existingUser = await this.userRepository.findByEmail(signUpDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const { password, ...userData } = signUpDto;
    const hashedPassword = await this.hashingService.hash(password);
    // TODO: should use some sort of queue to send notificatons insted of make users waiting
    // await this.notificationService.sendEmial({ to: 'amrrdev@gmail.com', subject: 'Test', text: 'Hi, Amr' });
    const newUser = await this.userRepository.createUser({ ...userData, password: hashedPassword });

    return newUser;
  }

  async singIn(signInDto: SignInDto) {
    console.log(`request number ${++AuthenticationService.nofr}`);
    const existingUser = await this.userRepository.findByEmail(signInDto.email);
    if (!existingUser || !(await this.hashingService.compare(signInDto.password, existingUser.password))) {
      throw new ConflictException('Invalid email or password');
    }

    console.log(`completed ${++AuthenticationService.comp}`);
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
