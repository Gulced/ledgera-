import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import type { UserRole } from '../../transactions/dto/transaction.dto';

export const WORKSPACE_ENTITY_TYPES = ['listing', 'transaction'] as const;
export type WorkspaceEntityType = (typeof WORKSPACE_ENTITY_TYPES)[number];

export interface WorkspaceNoteDto {
  id: string;
  entityType: WorkspaceEntityType;
  entityId: string;
  body: string;
  authorName: string;
  authorRole: UserRole;
  createdAt: string;
}

export interface WorkspaceTaskDto {
  id: string;
  entityType: WorkspaceEntityType;
  entityId: string;
  title: string;
  dueDate: string;
  status: 'open' | 'done';
  assigneeName: string;
  createdAt: string;
}

export interface WorkspaceDocumentDto {
  id: string;
  entityType: WorkspaceEntityType;
  entityId: string;
  name: string;
  type: 'agreement' | 'deed' | 'invoice' | 'commission_sheet' | 'compliance_note';
  status: 'pending' | 'ready';
  createdAt: string;
}

export interface WorkspaceEventDto {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  actorName: string;
  entityType?: WorkspaceEntityType;
  entityId?: string;
}

export class WorkspaceListQueryDto {
  @IsOptional()
  @IsIn(WORKSPACE_ENTITY_TYPES)
  entityType?: WorkspaceEntityType;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number;
}

export class CreateWorkspaceNoteDto {
  @IsIn(WORKSPACE_ENTITY_TYPES)
  entityType: WorkspaceEntityType;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  body: string;
}

export class CreateWorkspaceTaskDto {
  @IsIn(WORKSPACE_ENTITY_TYPES)
  entityType: WorkspaceEntityType;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  dueDate: string;

  @IsOptional()
  @IsString()
  assigneeName?: string;
}

export class UpdateWorkspaceTaskStatusDto {
  @IsIn(['open', 'done'])
  status: 'open' | 'done';
}

export class CreateWorkspaceDocumentDto {
  @IsIn(WORKSPACE_ENTITY_TYPES)
  entityType: WorkspaceEntityType;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(['agreement', 'deed', 'invoice', 'commission_sheet', 'compliance_note'])
  type: WorkspaceDocumentDto['type'];

  @IsIn(['pending', 'ready'])
  status: WorkspaceDocumentDto['status'];
}

export class UpdateWorkspaceDocumentStatusDto {
  @IsIn(['pending', 'ready'])
  status: WorkspaceDocumentDto['status'];
}
