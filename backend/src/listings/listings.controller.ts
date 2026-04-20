import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UserRole } from '../transactions/dto/transaction.dto';
import { buildAuthorizedActorContext } from '../transactions/auth/transaction-authorization';
import {
  CreateListingDto,
  ListingListQueryDto,
  UpdateListingDto,
  UpdateListingStatusDto,
} from './dto/listing.dto';
import { ListingAssistantRequestDto } from './dto/listing-assistant.dto';
import { ListingAssistantService } from './listing-assistant.service';
import { ListingsService } from './listings.service';

@ApiTags('Listings')
@ApiHeader({
  name: 'x-user-id',
  required: true,
  description: 'Authenticated actor identifier used by the role/ownership layer.',
})
@ApiHeader({
  name: 'x-user-name',
  required: false,
  description: 'Optional display name used for audit visibility.',
})
@ApiHeader({
  name: 'x-user-role',
  required: true,
  description: 'Actor role. Allowed values: admin, operations, finance, agent.',
})
@Controller('listings')
export class ListingsController {
  constructor(
    private readonly listingsService: ListingsService,
    private readonly listingAssistantService: ListingAssistantService,
  ) {}

  @ApiOperation({ summary: 'List listings with role-aware visibility.' })
  @Get()
  findAll(
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
    @Query() query: ListingListQueryDto = {},
  ) {
    return this.listingsService.findAll(
      buildAuthorizedActorContext(userId, name, role),
      query,
    );
  }

  @ApiOperation({ summary: 'Get one listing by id.' })
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    return this.listingsService.findById(
      id,
      buildAuthorizedActorContext(userId, name, role),
    );
  }

  @ApiOperation({ summary: 'Create a new listing. Agents can only create their own listings.' })
  @Post()
  create(
    @Body() payload: CreateListingDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    return this.listingsService.create(
      payload,
      buildAuthorizedActorContext(userId, name, role),
    );
  }

  @ApiOperation({ summary: 'Update listing status from the listing board.' })
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() payload: UpdateListingStatusDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    return this.listingsService.updateStatus(
      id,
      payload.status,
      buildAuthorizedActorContext(userId, name, role),
    );
  }

  @ApiOperation({ summary: 'Update listing fields and assignment.' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() payload: UpdateListingDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    return this.listingsService.update(
      id,
      payload,
      buildAuthorizedActorContext(userId, name, role),
    );
  }

  @ApiOperation({ summary: 'Delete a listing.' })
  @HttpCode(204)
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    await this.listingsService.delete(
      id,
      buildAuthorizedActorContext(userId, name, role),
    );
  }

  @ApiOperation({ summary: 'Generate listing-specific assistant guidance.' })
  @Post(':id/assistant')
  async assist(
    @Param('id') id: string,
    @Body() payload: ListingAssistantRequestDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    const actor = buildAuthorizedActorContext(userId, name, role);
    const listing = await this.listingsService.findById(id, actor);
    const action = payload.action ?? 'listing_summary';
    const prompt = payload.prompt?.trim() || 'Provide practical guidance for this listing.';

    return this.listingAssistantService.createResponse({
      listing,
      actor,
      action,
      prompt,
    });
  }
}
