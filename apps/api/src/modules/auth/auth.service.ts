import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto, UserRole } from '@newsflow/shared-types';
import { Role } from '@newsflow/database';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async validateUser(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: { organization: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('La cuenta se encuentra inactiva');
    }

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    const primaryMembership = user.memberships[0];

    if (!primaryMembership) {
      throw new UnauthorizedException('El usuario no está asignado a ninguna organización');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      organizationId: primaryMembership.organizationId,
      role: primaryMembership.role,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1d' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Registrar en auditoría
    await this.prisma.auditLog.create({
      data: {
        organizationId: primaryMembership.organizationId,
        actorId: user.id,
        action: 'USER_LOGIN',
        targetType: 'USER',
        targetId: user.id,
        metadataRedacted: { email: user.email },
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: primaryMembership.role,
        organizationId: primaryMembership.organizationId,
        organizationName: primaryMembership.organization.name,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Ya existe un usuario con este correo electrónico');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(registerDto.password, salt);

    // Transacción: crear organización, usuario y membresía
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: registerDto.organizationName,
          timezone: 'America/Bogota',
        },
      });

      const user = await tx.user.create({
        data: {
          email: registerDto.email,
          passwordHash,
        },
      });

      const roleEnum = String(registerDto.role || Role.ORG_ADMIN);

      await tx.membership.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: roleEnum,
        },
      });

      // Crear fuentes RSS iniciales reales para la nueva organización
      await tx.newsSource.create({
        data: {
          organizationId: org.id,
          name: 'El Tiempo - Colombia',
          type: 'RSS',
          url: 'https://www.eltiempo.com/rss/colombia.xml',
          locale: 'es-CO',
          category: 'Colombia',
          pollingInterval: 30,
        },
      });

      return {
        message: 'Organización y cuenta creadas exitosamente',
        userId: user.id,
        organizationId: org.id,
      };
    });
  }

  async getMe(userId: string, organizationId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { organizationId },
          include: { organization: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const membership = user.memberships[0];

    return {
      id: user.id,
      email: user.email,
      role: membership?.role,
      organizationId: membership?.organizationId,
      organizationName: membership?.organization.name,
      timezone: membership?.organization.timezone || 'America/Bogota',
    };
  }
}
