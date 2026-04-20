import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import type { AgentDto } from './dto/agent.dto';
import { AgentsRepository } from './agents.repository';
import { AgentRecord, type AgentDocument } from './schemas/agent.schema';

@Injectable()
export class MongoAgentsRepository implements AgentsRepository {
  constructor(
    @InjectModel(AgentRecord.name)
    private readonly agentModel: Model<AgentDocument>,
  ) {}

  async findAll(): Promise<AgentDto[]> {
    const documents = await this.agentModel
      .find()
      .sort({ name: 1 })
      .lean<AgentDto[]>()
      .exec();

    return documents.map((document) => this.stripMongoFields(document));
  }

  async findById(id: string): Promise<AgentDto | null> {
    const document = await this.agentModel
      .findOne({ id })
      .lean<AgentDto | null>()
      .exec();

    return document ? this.stripMongoFields(document) : null;
  }

  async create(agent: AgentDto): Promise<AgentDto> {
    const created = await this.agentModel.create(agent);

    return this.stripMongoFields(
      created.toObject<AgentDto>({
        versionKey: false,
      }),
    );
  }

  private stripMongoFields(document: AgentDto & { _id?: unknown }) {
    const { _id, ...agent } = document;

    return agent;
  }
}
