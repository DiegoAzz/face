import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { LoginDtoSchema, RegisterDtoSchema } from '@newsflow/shared-types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const parseResult = LoginDtoSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException('Datos de inicio de sesión inválidos');
    }

    const result = await this.authService.login(parseResult.data);

    // Configurar cookie compatible tanto en HTTP como en HTTPS (reverse proxy)
    res.cookie('newsflow_token', result.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 1 día
    });

    return result;
  }

  @Post('register')
  async register(@Body() body: any) {
    const parseResult = RegisterDtoSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException('Datos de registro inválidos');
    }

    return this.authService.register(parseResult.data);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('newsflow_token');
    return { message: 'Sesión cerrada correctamente' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.userId, user.organizationId);
  }
}
