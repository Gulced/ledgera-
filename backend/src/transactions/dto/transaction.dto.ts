import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export type TransactionStage =
  | 'agreement'
  | 'earnest_money'
  | 'title_deed'
  | 'completed';

export type CommissionReason = 'listing' | 'selling' | 'listing_and_selling';
export type UserRole = 'admin' | 'operations' | 'finance' | 'agent';
export type ActivityAction =
  | 'transaction_created'
  | 'transaction_updated'
  | 'stage_transitioned'
  | 'financials_locked';
export type TransactionSortBy = 'createdAt' | 'updatedAt' | 'totalServiceFee';
export type SortOrder = 'asc' | 'desc';

const TRANSACTION_STAGE_VALUES = [
  'agreement',
  'earnest_money',
  'title_deed',
  'completed',
] as const;
const TRANSACTION_SORT_BY_VALUES = [
  'createdAt',
  'updatedAt',
  'totalServiceFee',
] as const;
const SORT_ORDER_VALUES = ['asc', 'desc'] as const;

export const SUPPORTED_CURRENCY_VALUES = ['EUR', 'USD', 'TRY', 'GBP'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCY_VALUES)[number];

export interface ActorContextDto {
  userId: string;
  name?: string;
  role: UserRole;
}

export interface AgentRefDto {
  id: string;
  name: string;
}

export class AgentRefRequestDto implements AgentRefDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  propertyRef: string;

  @IsNumber()
  @IsPositive()
  totalServiceFee: number;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCY_VALUES)
  currency?: SupportedCurrency;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => AgentRefRequestDto)
  listingAgent: AgentRefRequestDto;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => AgentRefRequestDto)
  sellingAgent: AgentRefRequestDto;
}

export class TransitionTransactionDto {
  @IsIn(TRANSACTION_STAGE_VALUES)
  stage: TransactionStage;
}

export class UpdateTransactionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  propertyRef?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  totalServiceFee?: number;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCY_VALUES)
  currency?: SupportedCurrency;

  @IsOptional()
  @ValidateNested()
  @Type(() => AgentRefRequestDto)
  listingAgent?: AgentRefRequestDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AgentRefRequestDto)
  sellingAgent?: AgentRefRequestDto;
}

export class TransactionListQueryDto {
  @IsOptional()
  @IsIn(TRANSACTION_STAGE_VALUES)
  stage?: TransactionStage;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCY_VALUES)
  currency?: SupportedCurrency;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsIn(TRANSACTION_SORT_BY_VALUES)
  sortBy?: TransactionSortBy;

  @IsOptional()
  @IsIn(SORT_ORDER_VALUES)
  order?: SortOrder;
}

export interface CommissionPayoutDto {
  agentId: string;
  agentName: string;
  amount: number;
  reason: CommissionReason;
}

export interface CommissionExplanationDto {
  code: 'agency_share' | 'single_agent_full_pool' | 'dual_agent_equal_split';
  message: string;
}

export interface CommissionBreakdownDto {
  agencyShare: number;
  agentPool: number;
  payouts: CommissionPayoutDto[];
  explanation: CommissionExplanationDto[];
}

export interface TransactionHistoryItemDto {
  stage: TransactionStage;
  changedAt: string;
  changedBy: ActorContextDto;
}

export interface ActivityLogEntryDto {
  id: string;
  type: ActivityAction;
  summary: string;
  timestamp: string;
  actorId: string;
  actorRole: UserRole;
  actorName?: string;
  previousValue?: Record<string, string | number | boolean | null>;
  nextValue?: Record<string, string | number | boolean | null>;
}

export interface FinancialIntegrityDto {
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: ActorContextDto;
}

export interface TransactionDto {
  id: string;
  propertyRef: string;
  totalServiceFee: number;
  currency: SupportedCurrency;
  stage: TransactionStage;
  listingAgent: AgentRefDto;
  sellingAgent: AgentRefDto;
  commission: CommissionBreakdownDto;
  history: TransactionHistoryItemDto[];
  activityLog: ActivityLogEntryDto[];
  financialIntegrity: FinancialIntegrityDto;
  createdBy: ActorContextDto;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResultDto<T> {
  items: T[];
  paginationMeta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CommissionPreviewDto {
  propertyRef: string;
  currency: SupportedCurrency;
  requestedBy: ActorContextDto;
  commission: CommissionBreakdownDto;
  message: string;
}

export interface TransactionSummaryDto {
  totals: {
    transactions: number;
    completedTransactions: number;
    totalServiceFee: number;
    totalAgencyEarnings: number;
    totalAgentEarnings: number;
  };
  stageDistribution: Record<TransactionStage, number>;
  earningsBreakdown: {
    agencyTotal: number;
    agentTotal: number;
  };
  currencyBreakdown: Record<string, number>;
}
