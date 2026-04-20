import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  AppBadRequestException,
  AppNotFoundException,
} from '../common/errors/app-error';
import type { AgentDto } from './dto/agent.dto';
import { CreateAgentDto } from './dto/agent.dto';
import { AgentsRepository } from './agents.repository';

@Injectable()
export class AgentsService {
  constructor(
    @Inject(AgentsRepository)
    private readonly agentsRepository: AgentsRepository,
  ) {}

  findAll(): Promise<AgentDto[]> {
    return this.agentsRepository.findAll();
  }

  async findById(id: string): Promise<AgentDto> {
    const agent = await this.agentsRepository.findById(id);

    if (!agent) {
      throw new AppNotFoundException('AGENT_NOT_FOUND', `Agent ${id} not found.`);
    }

    return agent;
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

  async create(payload: CreateAgentDto): Promise<AgentDto> {
    const now = new Date().toISOString();
    const generatedId = await this.generateAgentId();

    return this.agentsRepository.create({
      id: generatedId,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      isActive: payload.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
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
