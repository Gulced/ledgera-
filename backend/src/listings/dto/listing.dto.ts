import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import type {
  ActorContextDto,
  AgentRefDto,
  SupportedCurrency,
} from '../../transactions/dto/transaction.dto';
import { AgentRefRequestDto, SUPPORTED_CURRENCY_VALUES } from '../../transactions/dto/transaction.dto';

export type ListingStatus = 'active' | 'under_offer' | 'closed';

const LISTING_STATUS_VALUES = ['active', 'under_offer', 'closed'] as const;

export interface ListingPhotoDto {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  storage: 'local' | 'cloudinary';
  publicId?: string;
  uploadedAt: string;
  isCover: boolean;
}

export class CreateListingDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  fullAddress: string;

  @IsNumber()
  @IsPositive()
  askingPrice: number;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCY_VALUES)
  currency?: SupportedCurrency;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => AgentRefRequestDto)
  listingAgent: AgentRefRequestDto;
}

export class ListingListQueryDto {
  @IsOptional()
  @IsIn(LISTING_STATUS_VALUES)
  status?: ListingStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  agentId?: string;
}

export class UpdateListingStatusDto {
  @IsIn(LISTING_STATUS_VALUES)
  status: ListingStatus;
}

export class UpdateListingDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  fullAddress: string;

  @IsNumber()
  @IsPositive()
  askingPrice: number;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCY_VALUES)
  currency?: SupportedCurrency;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => AgentRefRequestDto)
  listingAgent: AgentRefRequestDto;
}

export interface ListingDto {
  id: string;
  propertyRef: string;
  title: string;
  city: string;
  fullAddress: string;
  askingPrice: number;
  currency: SupportedCurrency;
  status: ListingStatus;
  photos: ListingPhotoDto[];
  listingAgent: AgentRefDto;
  createdBy: ActorContextDto;
  createdAt: string;
  updatedAt: string;
}
