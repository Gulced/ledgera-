import { IsIn, IsOptional, IsString } from 'class-validator';
import type { ActorContextDto } from '../../transactions/dto/transaction.dto';

export const LISTING_ASSISTANT_ACTIONS = [
  'next_step',
  'client_message',
  'listing_summary',
  'risk_review',
  'follow_up_tasks',
] as const;

export type ListingAssistantAction = (typeof LISTING_ASSISTANT_ACTIONS)[number];

export class ListingAssistantRequestDto {
  @IsOptional()
  @IsIn(LISTING_ASSISTANT_ACTIONS)
  action?: ListingAssistantAction;

  @IsOptional()
  @IsString()
  prompt?: string;
}

export interface ListingAssistantResponseDto {
  listingId: string;
  action: ListingAssistantAction;
  prompt: string;
  response: string;
  requestedBy: ActorContextDto;
}
