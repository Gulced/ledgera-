import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ASSISTANT_PAGE_TYPES, type AssistantPageType } from '../dto/assistant.dto';

export type AssistantMessageDocument = HydratedDocument<AssistantMessageRecord>;

@Schema({
  collection: 'assistant_messages',
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class AssistantMessageRecord {
  @Prop({ required: true, trim: true })
  actorId: string;

  @Prop({ required: true, trim: true })
  actorRole: string;

  @Prop({ trim: true })
  actorName?: string;

  @Prop({ required: true, enum: ASSISTANT_PAGE_TYPES })
  pageType: AssistantPageType;

  @Prop({ trim: true })
  entityId?: string;

  @Prop({ required: true, enum: ['user', 'assistant'] })
  role: 'user' | 'assistant';

  @Prop({ required: true, trim: true })
  body: string;

  @Prop({ enum: ['gemini', 'fallback'] })
  source?: 'gemini' | 'fallback';

  createdAt!: Date;
}

export const AssistantMessageSchema = SchemaFactory.createForClass(AssistantMessageRecord);
