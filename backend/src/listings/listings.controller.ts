import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  UploadedFiles,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
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

  @ApiOperation({ summary: 'Upload listing photos.' })
  @Post(':id/photos')
  @UseInterceptors(
    FilesInterceptor('files', 12, {
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          const directory = `${process.cwd()}/uploads/listings`;
          mkdirSync(directory, { recursive: true });
          callback(null, directory);
        },
        filename: (_request, file, callback) => {
          const extension = extname(file.originalname || '').toLowerCase() || '.jpg';
          callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
        },
      }),
      fileFilter: (_request, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(
            new Error('Only image uploads are supported for listing photos.'),
            false,
          );
          return;
        }

        callback(null, true);
      },
      limits: {
        fileSize: 8 * 1024 * 1024,
      },
    }),
  )
  uploadPhotos(
    @Param('id') id: string,
    @UploadedFiles()
    files: Array<{
      filename: string;
      originalname: string;
      mimetype: string;
      size: number;
    }>,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    return this.listingsService.addPhotos(
      id,
      files ?? [],
      buildAuthorizedActorContext(userId, name, role),
    );
  }

  @ApiOperation({ summary: 'Delete one listing photo.' })
  @Delete(':id/photos/:photoId')
  @HttpCode(HttpStatus.OK)
  deletePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    return this.listingsService.deletePhoto(
      id,
      photoId,
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
