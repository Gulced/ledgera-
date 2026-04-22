import type { AgentDto } from './dto/agent.dto';

export abstract class AgentsRepository {
  abstract findAll(): Promise<AgentDto[]>;
  abstract findById(id: string): Promise<AgentDto | null>;
  abstract findByEmail(email: string): Promise<AgentDto | null>;
  abstract create(agent: AgentDto): Promise<AgentDto>;
  abstract update(id: string, agent: AgentDto): Promise<AgentDto>;
  abstract delete(id: string): Promise<void>;
}
