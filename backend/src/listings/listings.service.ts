import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { AgentsService } from '../agents/agents.service';
import {
  AppBadRequestException,
  AppForbiddenException,
  AppNotFoundException,
} from '../common/errors/app-error';
import type { ActorContextDto, SupportedCurrency } from '../transactions/dto/transaction.dto';
import { SUPPORTED_CURRENCY_VALUES } from '../transactions/dto/transaction.dto';
import type {
  CreateListingDto,
  ListingDto,
  ListingPhotoDto,
  ListingListQueryDto,
  ListingStatus,
  UpdateListingDto,
} from './dto/listing.dto';
import { ListingsRepository } from './listings.repository';

@Injectable()
export class ListingsService {
  constructor(
    @Inject(ListingsRepository)
    private readonly listingsRepository: ListingsRepository,
    private readonly agentsService: AgentsService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(
    actor: ActorContextDto,
    query: ListingListQueryDto = {},
  ): Promise<ListingDto[]> {
    this.assertCanListListings(actor, query);
    const listings = await this.listingsRepository.findAll();
    const visibleListings =
      actor.role === 'agent'
        ? listings.filter((listing) => listing.listingAgent.id === actor.userId)
        : listings;

    return visibleListings
      .filter((listing) => (query.status ? listing.status === query.status : true))
      .filter((listing) =>
        query.agentId ? listing.listingAgent.id === query.agentId : true,
      )
      .filter((listing) => (query.search ? this.matchesSearch(listing, query.search) : true));
  }

  async findById(id: string, actor: ActorContextDto): Promise<ListingDto> {
    const listing = await this.listingsRepository.findById(id);

    if (!listing) {
      throw new AppNotFoundException('LISTING_NOT_FOUND', `Listing ${id} not found.`);
    }

    if (actor.role === 'agent' && listing.listingAgent.id !== actor.userId) {
      throw new AppForbiddenException(
        'UNAUTHORIZED_LISTING_ACCESS',
        'Agents can only access their own listings.',
      );
    }

    return listing;
  }

  async create(payload: CreateListingDto, actor: ActorContextDto): Promise<ListingDto> {
    this.assertCanCreateListing(actor, payload);
    this.validateListingPayload(payload);

    const listingAgent = await this.agentsService.findActiveById(payload.listingAgent.id);
    const now = new Date().toISOString();
    const propertyRef = await this.generatePropertyRef(payload.city);

    return this.listingsRepository.create({
      id: crypto.randomUUID(),
      propertyRef,
      title: payload.title,
      city: payload.city,
      fullAddress: payload.fullAddress,
      askingPrice: payload.askingPrice,
      currency: payload.currency ?? 'EUR',
      status: 'active',
      photos: [],
      listingAgent: {
        id: listingAgent.id,
        name: listingAgent.name,
      },
      createdBy: actor,
      createdAt: now,
      updatedAt: now,
    });
  }

  async updateStatus(
    id: string,
    status: ListingStatus,
    actor: ActorContextDto,
  ): Promise<ListingDto> {
    const listing = await this.findById(id, actor);
    this.assertCanUpdateListingStatus(actor, listing);

    if (listing.status === status) {
      return listing;
    }

    return this.listingsRepository.update(id, {
      ...listing,
      status,
      updatedAt: new Date().toISOString(),
    });
  }

  async update(
    id: string,
    payload: UpdateListingDto,
    actor: ActorContextDto,
  ): Promise<ListingDto> {
    const listing = await this.findById(id, actor);
    this.assertCanManageListing(actor, listing, payload.listingAgent.id);
    this.validateListingPayload(payload);

    const listingAgent = await this.agentsService.findActiveById(payload.listingAgent.id);

    return this.listingsRepository.update(id, {
      ...listing,
      title: payload.title.trim(),
      city: payload.city.trim(),
      fullAddress: payload.fullAddress.trim(),
      askingPrice: payload.askingPrice,
      currency: payload.currency ?? listing.currency,
      listingAgent: {
        id: listingAgent.id,
        name: listingAgent.name,
      },
      updatedAt: new Date().toISOString(),
    });
  }

  async delete(id: string, actor: ActorContextDto): Promise<void> {
    const listing = await this.findById(id, actor);
    this.assertCanManageListing(actor, listing);

    await Promise.all(
      listing.photos.map((photo) => this.deleteStoredPhoto(photo)),
    );

    await this.listingsRepository.delete(id);
  }

  async addPhotos(
    id: string,
    files: Array<{
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    }>,
    actor: ActorContextDto,
  ): Promise<ListingDto> {
    const listing = await this.findById(id, actor);
    this.assertCanManageListing(actor, listing);

    if (!files.length) {
      throw new AppBadRequestException(
        'INVALID_LISTING_PAYLOAD',
        'At least one image file is required.',
      );
    }

    const newPhotos = await Promise.all(
      files.map((file, index) =>
        this.storePhoto(file, listing.photos.length === 0 && index === 0),
      ),
    );

    return this.listingsRepository.update(id, {
      ...listing,
      photos: [...listing.photos, ...newPhotos],
      updatedAt: new Date().toISOString(),
    });
  }

  async deletePhoto(
    id: string,
    photoId: string,
    actor: ActorContextDto,
  ): Promise<ListingDto> {
    const listing = await this.findById(id, actor);
    this.assertCanManageListing(actor, listing);
    const photo = listing.photos.find((item) => item.id === photoId);

    if (!photo) {
      throw new AppNotFoundException(
        'LISTING_NOT_FOUND',
        `Photo ${photoId} was not found for listing ${id}.`,
      );
    }

    await this.deleteStoredPhoto(photo);

    const remainingPhotos = listing.photos
      .filter((item) => item.id !== photoId)
      .map((item, index) => ({
        ...item,
        isCover: index === 0,
      }));

    return this.listingsRepository.update(id, {
      ...listing,
      photos: remainingPhotos,
      updatedAt: new Date().toISOString(),
    });
  }

  private assertCanListListings(actor: ActorContextDto, query: ListingListQueryDto) {
    if (actor.role === 'agent' && query.agentId && query.agentId !== actor.userId) {
      throw new AppForbiddenException(
        'UNAUTHORIZED_LISTING_ACCESS',
        'Agents can only filter their own listings.',
      );
    }
  }

  private assertCanCreateListing(actor: ActorContextDto, payload: CreateListingDto) {
    if (!['admin', 'agent'].includes(actor.role)) {
      throw new AppForbiddenException(
        'UNAUTHORIZED_LISTING_ACCESS',
        'Only admins and agents can create listings.',
      );
    }

    if (actor.role === 'agent' && payload.listingAgent.id !== actor.userId) {
      throw new AppForbiddenException(
        'UNAUTHORIZED_LISTING_ACCESS',
        'Agents can only create listings for themselves.',
      );
    }
  }

  private assertCanManageListing(
    actor: ActorContextDto,
    listing: ListingDto,
    nextListingAgentId?: string,
  ) {
    if (actor.role === 'admin') {
      return;
    }

    if (actor.role === 'agent' && listing.listingAgent.id === actor.userId) {
      if (nextListingAgentId && nextListingAgentId !== actor.userId) {
        throw new AppForbiddenException(
          'UNAUTHORIZED_LISTING_ACCESS',
          'Agents cannot reassign listings to another agent.',
        );
      }

      return;
    }

    throw new AppForbiddenException(
      'UNAUTHORIZED_LISTING_ACCESS',
      'This role cannot modify the listing.',
    );
  }

  private assertCanUpdateListingStatus(actor: ActorContextDto, listing: ListingDto) {
    if (['admin', 'operations'].includes(actor.role)) {
      return;
    }

    if (actor.role === 'agent' && listing.listingAgent.id === actor.userId) {
      return;
    }

    throw new AppForbiddenException(
      'UNAUTHORIZED_LISTING_ACCESS',
      'This role cannot update listing status.',
    );
  }

  private validateListingPayload(payload: CreateListingDto | UpdateListingDto) {
    if (!payload.title.trim()) {
      throw new AppBadRequestException(
        'INVALID_LISTING_PAYLOAD',
        'title is required.',
      );
    }

    if (!payload.city.trim()) {
      throw new AppBadRequestException(
        'INVALID_LISTING_PAYLOAD',
        'city is required.',
      );
    }

    if (!payload.fullAddress.trim()) {
      throw new AppBadRequestException(
        'INVALID_LISTING_PAYLOAD',
        'fullAddress is required.',
      );
    }

    if (!Number.isFinite(payload.askingPrice) || payload.askingPrice <= 0) {
      throw new AppBadRequestException(
        'INVALID_LISTING_PAYLOAD',
        'askingPrice must be greater than 0.',
      );
    }

    if (
      payload.currency &&
      !SUPPORTED_CURRENCY_VALUES.includes(payload.currency as SupportedCurrency)
    ) {
      throw new AppBadRequestException(
        'INVALID_LISTING_PAYLOAD',
        `currency must be one of: ${SUPPORTED_CURRENCY_VALUES.join(', ')}.`,
      );
    }
  }

  private async generatePropertyRef(city: string) {
    const normalizedCity = city
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 3)
      .padEnd(3, 'X');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
      const candidate = `LST-${normalizedCity}-${suffix}`;
      const listings = await this.listingsRepository.findAll();

      if (!listings.some((listing) => listing.propertyRef === candidate)) {
        return candidate;
      }
    }

    throw new AppBadRequestException(
      'INVALID_LISTING_PAYLOAD',
      'Property reference could not be generated. Please try again.',
    );
  }

  private matchesSearch(listing: ListingDto, search: string) {
    const tokens = search
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    if (!tokens.length) {
      return true;
    }

    const searchableText = [
      listing.propertyRef,
      listing.title,
      listing.city,
      listing.fullAddress,
      listing.listingAgent.name,
      listing.status,
    ]
      .join(' ')
      .toLowerCase();

    return tokens.every((token) => searchableText.includes(token));
  }

  private async storePhoto(
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    isCover: boolean,
  ): Promise<ListingPhotoDto> {
    const uploadedAt = new Date().toISOString();
    const cloudinaryCloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const cloudinaryApiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const cloudinaryApiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    const cloudinaryFolder =
      this.configService.get<string>('CLOUDINARY_FOLDER') ?? 'ledgera/listings';

    if (cloudinaryCloudName && cloudinaryApiKey && cloudinaryApiSecret) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const publicId = `${cloudinaryFolder}/${crypto.randomUUID()}`;
      const signatureBase = `public_id=${publicId}&timestamp=${timestamp}${cloudinaryApiSecret}`;
      const signature = crypto.createHash('sha1').update(signatureBase).digest('hex');
      const formData = new FormData();

      formData.append(
        'file',
        new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
        file.originalname,
      );
      formData.append('api_key', cloudinaryApiKey);
      formData.append('timestamp', timestamp);
      formData.append('public_id', publicId);
      formData.append('signature', signature);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        },
      );

      if (response.ok) {
        const result = (await response.json()) as {
          secure_url?: string;
          public_id?: string;
        };

        if (result.secure_url && result.public_id) {
          return {
            id: crypto.randomUUID(),
            fileName: path.basename(result.public_id),
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            url: result.secure_url,
            storage: 'cloudinary',
            publicId: result.public_id,
            uploadedAt,
            isCover,
          };
        }
      }
    }

    const directory = path.join(process.cwd(), 'uploads', 'listings');
    await mkdir(directory, { recursive: true });
    const extension = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    await writeFile(path.join(directory, fileName), file.buffer);

    return {
      id: crypto.randomUUID(),
      fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/listings/${fileName}`,
      storage: 'local',
      uploadedAt,
      isCover,
    };
  }

  private async deleteStoredPhoto(photo: ListingPhotoDto) {
    if (photo.storage === 'cloudinary' && photo.publicId) {
      const cloudinaryCloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
      const cloudinaryApiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
      const cloudinaryApiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

      if (cloudinaryCloudName && cloudinaryApiKey && cloudinaryApiSecret) {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signatureBase = `public_id=${photo.publicId}&timestamp=${timestamp}${cloudinaryApiSecret}`;
        const signature = crypto.createHash('sha1').update(signatureBase).digest('hex');
        const formData = new FormData();

        formData.append('public_id', photo.publicId);
        formData.append('api_key', cloudinaryApiKey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);

        await fetch(
          `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/destroy`,
          {
            method: 'POST',
            body: formData,
          },
        ).catch(() => undefined);
      }

      return;
    }

    if (photo.url.startsWith('/uploads/')) {
      await unlink(path.join(process.cwd(), photo.url.replace(/^\/+/, ''))).catch(() => undefined);
    }
  }
}
