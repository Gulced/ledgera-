import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import type { ActorContextDto } from '../../transactions/dto/transaction.dto';
import type { ListingStatus } from '../../listings/dto/listing.dto';

export const ASSISTANT_PAGE_TYPES = [
  'dashboard',
  'agents',
  'listings',
  'listing_detail',
  'transaction_detail',
] as const;

export type AssistantPageType = (typeof ASSISTANT_PAGE_TYPES)[number];

export class AssistantRequestDto {
  @IsIn(ASSISTANT_PAGE_TYPES)
  pageType: AssistantPageType;

  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsObject()
  context: Record<string, unknown>;
}

export class AssistantHistoryQueryDto {
  @IsIn(ASSISTANT_PAGE_TYPES)
  pageType: AssistantPageType;

  @IsOptional()
  @IsString()
  entityId?: string;
}

export type AssistantActionKind = 'create_note' | 'create_task' | 'update_listing_status';

export interface AssistantActionBaseDto {
  id: string;
  kind: AssistantActionKind;
  entityType: 'listing' | 'transaction';
  entityId: string;
  label: string;
  description: string;
}

export interface AssistantCreateNoteActionDto extends AssistantActionBaseDto {
  kind: 'create_note';
  body: string;
}

export interface AssistantCreateTaskActionDto extends AssistantActionBaseDto {
  kind: 'create_task';
  title: string;
  dueDate: string;
  assigneeName?: string;
}

export interface AssistantUpdateListingStatusActionDto extends AssistantActionBaseDto {
  kind: 'update_listing_status';
  status: ListingStatus;
}

export type AssistantProposedActionDto =
  | AssistantCreateNoteActionDto
  | AssistantCreateTaskActionDto
  | AssistantUpdateListingStatusActionDto;

export interface AssistantResponseDto {
  pageType: AssistantPageType;
  prompt: string;
  response: string;
  source: 'gemini' | 'fallback';
  proposedActions: AssistantProposedActionDto[];
  entityId?: string;
  requestedBy: ActorContextDto;
}

export interface AssistantMessageDto {
  id: string;
  pageType: AssistantPageType;
  entityId?: string;
  role: 'user' | 'assistant';
  body: string;
  source?: 'gemini' | 'fallback';
  createdAt: string;
}
