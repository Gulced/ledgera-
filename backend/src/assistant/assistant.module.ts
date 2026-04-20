import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { AssistantMessageRecord, AssistantMessageSchema } from './schemas/assistant-message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AssistantMessageRecord.name, schema: AssistantMessageSchema },
    ]),
  ],
  controllers: [AssistantController],
  providers: [AssistantService],
  exports: [AssistantService],
})
export class AssistantModule {}
