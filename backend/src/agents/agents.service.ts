import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { GeminiEmailValidationService } from '../common/gemini-email-validation.service';
import {
  AppBadRequestException,
  AppForbiddenException,
  AppNotFoundException,
} from '../common/errors/app-error';
import type { ActorContextDto } from '../transactions/dto/transaction.dto';
import type { AgentDto } from './dto/agent.dto';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';
import { AgentsRepository } from './agents.repository';

@Injectable()
export class AgentsService {
  constructor(
    @Inject(AgentsRepository)
    private readonly agentsRepository: AgentsRepository,
    private readonly emailValidationService: GeminiEmailValidationService,
  ) {}

  async findAll(actor?: ActorContextDto): Promise<AgentDto[]> {
    const agents = await this.agentsRepository.findAll();

    if (actor?.role === 'agent') {
      return agents.filter((agent) => agent.id === actor.userId);
    }

    return agents;
  }

  async findById(id: string, actor?: ActorContextDto): Promise<AgentDto> {
    const agent = await this.agentsRepository.findById(id);

    if (!agent) {
      throw new AppNotFoundException('AGENT_NOT_FOUND', `Agent ${id} not found.`);
    }

    if (actor?.role === 'agent' && actor.userId !== id) {
      throw new AppForbiddenException(
        'UNAUTHORIZED_AGENT_ACCESS',
        'Agents can only access their own profile.',
      );
    }

    return agent;
  }

  async findByEmail(email: string): Promise<AgentDto | null> {
    return this.agentsRepository.findByEmail(email);
  }

  async findActiveById(id: string): Promise<AgentDto> {
    const agent = await this.findById(id);

    if (!agent.isActive) {
      throw new AppBadRequestException(
        'INVALID_TRANSACTION_PAYLOAD',
        `Agent ${id} is not active.`,
      );
    }

    return agent;
  }

  async create(payload: CreateAgentDto, actor?: ActorContextDto): Promise<AgentDto> {
    this.assertCanManageAgents(actor, 'create');
    if (payload.email?.trim()) {
      await this.emailValidationService.assertValidEmail(payload.email, 'agent email');
    }
    const now = new Date().toISOString();
    const generatedId = await this.generateAgentId();

    return this.agentsRepository.create({
      id: generatedId,
      name: payload.name.trim(),
      email: payload.email?.trim() || undefined,
      phone: payload.phone?.trim() || undefined,
      isActive: payload.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
  }

  async update(
    id: string,
    payload: UpdateAgentDto,
    actor: ActorContextDto,
  ): Promise<AgentDto> {
    this.assertCanManageAgents(actor, 'update');
    const agent = await this.findById(id, actor);

    if (
      payload.name === undefined &&
      payload.email === undefined &&
      payload.phone === undefined &&
      payload.isActive === undefined
    ) {
      throw new AppBadRequestException(
        'INVALID_AGENT_PAYLOAD',
        'At least one field must be provided to update an agent.',
      );
    }

    const nextAgent: AgentDto = {
      ...agent,
      name: payload.name?.trim() || agent.name,
      email:
        payload.email === undefined
          ? agent.email
          : payload.email.trim() || undefined,
      phone:
        payload.phone === undefined
          ? agent.phone
          : payload.phone.trim() || undefined,
      isActive: payload.isActive ?? agent.isActive,
      updatedAt: new Date().toISOString(),
    };

    if (nextAgent.email) {
      await this.emailValidationService.assertValidEmail(nextAgent.email, 'agent email');
    }

    return this.agentsRepository.update(id, nextAgent);
  }

  async delete(id: string, actor: ActorContextDto): Promise<void> {
    this.assertCanManageAgents(actor, 'delete');
    await this.findById(id, actor);
    await this.agentsRepository.delete(id);
  }

  private assertCanManageAgents(
    actor: ActorContextDto | undefined,
    action: 'create' | 'update' | 'delete',
  ) {
    if (!actor || actor.role !== 'admin') {
      throw new AppForbiddenException(
        'UNAUTHORIZED_AGENT_ACCESS',
        `Only admins can ${action} agents.`,
      );
    }
  }

  private async generateAgentId(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = `agt_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
      const existing = await this.agentsRepository.findById(candidate);

      if (!existing) {
        return candidate;
      }
    }

    throw new AppBadRequestException(
      'INVALID_TRANSACTION_PAYLOAD',
      'Agent ID could not be generated. Please try again.',
    );
  }
}
