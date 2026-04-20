import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import type { ActorContextDto } from '../../transactions/dto/transaction.dto';

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

  @IsObject()
  context: Record<string, unknown>;
}

export interface AssistantResponseDto {
  pageType: AssistantPageType;
  prompt: string;
  response: string;
  source: 'gemini' | 'fallback';
  requestedBy: ActorContextDto;
}
