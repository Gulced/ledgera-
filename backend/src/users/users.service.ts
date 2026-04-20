import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AgentsService } from '../agents/agents.service';
import { GeminiEmailValidationService } from '../common/gemini-email-validation.service';
import {
  AppBadRequestException,
  AppUnauthorizedException,
} from '../common/errors/app-error';
import type {
  CreateUserDto,
  LoginUserDto,
  UserAccountDto,
  UserDto,
} from './dto/user.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @Inject(UsersRepository)
    private readonly usersRepository: UsersRepository,
    private readonly agentsService: AgentsService,
    private readonly emailValidationService: GeminiEmailValidationService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultUsers();
  }

  async findAll(): Promise<UserDto[]> {
    const users = await this.usersRepository.findAll();
    return users.map((user) => this.sanitize(user));
  }

  async create(payload: CreateUserDto): Promise<UserDto> {
    const normalizedEmail = payload.email.trim().toLowerCase();
    await this.emailValidationService.assertValidEmail(normalizedEmail, 'account email');
    const existing = await this.usersRepository.findByEmail(normalizedEmail);

    if (existing) {
      throw new AppBadRequestException(
        'ACCOUNT_ALREADY_EXISTS',
        `An account already exists for ${normalizedEmail}.`,
      );
    }

    if (payload.role === 'agent' && !payload.linkedAgentId) {
      throw new AppBadRequestException(
        'INVALID_USER_PAYLOAD',
        'Agent accounts must be linked to an existing agent profile.',
      );
    }

    if (payload.role === 'agent' && payload.linkedAgentId) {
      await this.agentsService.findActiveById(payload.linkedAgentId);
    }

    const now = new Date().toISOString();
    const created = await this.usersRepository.create({
      id: payload.linkedAgentId ?? this.createUserId(payload.role),
      name: payload.name.trim(),
      email: normalizedEmail,
      password: payload.password,
      role: payload.role,
      linkedAgentId: payload.linkedAgentId,
      createdAt: now,
      updatedAt: now,
    });

    return this.sanitize(created);
  }

  async login(payload: LoginUserDto): Promise<UserDto> {
    const normalizedEmail = payload.email.trim().toLowerCase();
    await this.emailValidationService.assertValidEmail(normalizedEmail, 'login email');
    const account = await this.usersRepository.findByEmail(normalizedEmail);

    if (!account || account.password !== payload.password) {
      throw new AppUnauthorizedException(
        'INVALID_LOGIN_CREDENTIALS',
        'No matching account was found for this email and password.',
      );
    }

    return this.sanitize(account);
  }

  private sanitize(user: UserAccountDto): UserDto {
    const { password, ...safeUser } = user;
    return safeUser;
  }

  private createUserId(role: UserDto['role']) {
    return `${role.slice(0, 3)}_${randomUUID().slice(0, 8)}`;
  }

  private async ensureDefaultUsers() {
    const defaults: Array<Omit<UserAccountDto, 'id' | 'createdAt' | 'updatedAt'>> = [
      {
        name: 'Aylin Admin',
        email: 'admin@ledgera.app',
        password: 'demo123',
        role: 'admin',
      },
      {
        name: 'Ozan Ops',
        email: 'operations@ledgera.app',
        password: 'demo123',
        role: 'operations',
      },
      {
        name: 'Ferah Finance',
        email: 'finance@ledgera.app',
        password: 'demo123',
        role: 'finance',
      },
    ];

    for (const account of defaults) {
      const existing = await this.usersRepository.findByEmail(account.email);
      if (existing) {
        continue;
      }

      const now = new Date().toISOString();
      await this.usersRepository.create({
        ...account,
        id: this.createUserId(account.role),
        createdAt: now,
        updatedAt: now,
      });
    }

    const agents = await this.agentsService.findAll();
    const defaultAgentAccounts = [
      {
        agentName: 'Gülce Duru KOÇ',
        email: 'gulcedurukoc@gmail.com',
      },
      {
        agentName: 'arzu agent',
        email: 'agent@ledgera.com',
      },
    ];

    for (const account of defaultAgentAccounts) {
      const existing = await this.usersRepository.findByEmail(account.email);
      if (existing) {
        continue;
      }

      const linkedAgent = agents.find(
        (agent) =>
          agent.name.trim().toLowerCase() === account.agentName.trim().toLowerCase() ||
          agent.email?.trim().toLowerCase() === account.email,
      );

      if (!linkedAgent) {
        continue;
      }

      const now = new Date().toISOString();
      await this.usersRepository.create({
        id: linkedAgent.id,
        linkedAgentId: linkedAgent.id,
        name: linkedAgent.name,
        email: account.email,
        password: 'demo123',
        role: 'agent',
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}
