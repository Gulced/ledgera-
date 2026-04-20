import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GeminiEmailValidationService } from '../common/gemini-email-validation.service';
import { AgentsController } from './agents.controller';
import { MongoAgentsRepository } from './mongo-agents.repository';
import { AgentsRepository } from './agents.repository';
import { AgentsService } from './agents.service';
import { AgentRecord, AgentSchema } from './schemas/agent.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: AgentRecord.name,
        schema: AgentSchema,
      },
    ]),
  ],
  controllers: [AgentsController],
  providers: [
    AgentsService,
    GeminiEmailValidationService,
    {
      provide: AgentsRepository,
      useClass: MongoAgentsRepository,
    },
  ],
  exports: [AgentsService, AgentsRepository],
})
export class AgentsModule {}
