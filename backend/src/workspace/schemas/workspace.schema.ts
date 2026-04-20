import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { WORKSPACE_ENTITY_TYPES } from '../dto/workspace.dto';

@Schema({ collection: 'workspace_notes', versionKey: false })
export class WorkspaceNoteRecord {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, enum: WORKSPACE_ENTITY_TYPES, index: true })
  entityType: 'listing' | 'transaction';

  @Prop({ required: true, index: true })
  entityId: string;

  @Prop({ required: true })
  body: string;

  @Prop({ required: true })
  authorName: string;

  @Prop({ required: true })
  authorRole: string;

  @Prop({ required: true })
  createdAt: string;
}

@Schema({ collection: 'workspace_tasks', versionKey: false })
export class WorkspaceTaskRecord {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, enum: WORKSPACE_ENTITY_TYPES, index: true })
  entityType: 'listing' | 'transaction';

  @Prop({ required: true, index: true })
  entityId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  dueDate: string;

  @Prop({ required: true, enum: ['open', 'done'], default: 'open' })
  status: 'open' | 'done';

  @Prop({ required: true })
  assigneeName: string;

  @Prop({ required: true })
  createdAt: string;
}

@Schema({ collection: 'workspace_documents', versionKey: false })
export class WorkspaceDocumentRecord {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, enum: WORKSPACE_ENTITY_TYPES, index: true })
  entityType: 'listing' | 'transaction';

  @Prop({ required: true, index: true })
  entityId: string;

  @Prop({ required: true })
  name: string;

  @Prop({
    required: true,
    enum: ['agreement', 'deed', 'invoice', 'commission_sheet', 'compliance_note'],
  })
  type: 'agreement' | 'deed' | 'invoice' | 'commission_sheet' | 'compliance_note';

  @Prop({ required: true, enum: ['pending', 'ready'] })
  status: 'pending' | 'ready';

  @Prop({ required: true })
  createdAt: string;
}

@Schema({ collection: 'workspace_events', versionKey: false })
export class WorkspaceEventRecord {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  createdAt: string;

  @Prop({ required: true })
  actorName: string;

  @Prop({ enum: WORKSPACE_ENTITY_TYPES })
  entityType?: 'listing' | 'transaction';

  @Prop()
  entityId?: string;
}

export type WorkspaceNoteDocument = HydratedDocument<WorkspaceNoteRecord>;
export type WorkspaceTaskDocument = HydratedDocument<WorkspaceTaskRecord>;
export type WorkspaceDocumentDocument = HydratedDocument<WorkspaceDocumentRecord>;
export type WorkspaceEventDocument = HydratedDocument<WorkspaceEventRecord>;

export const WorkspaceNoteSchema = SchemaFactory.createForClass(WorkspaceNoteRecord);
export const WorkspaceTaskSchema = SchemaFactory.createForClass(WorkspaceTaskRecord);
export const WorkspaceDocumentSchema = SchemaFactory.createForClass(WorkspaceDocumentRecord);
export const WorkspaceEventSchema = SchemaFactory.createForClass(WorkspaceEventRecord);
