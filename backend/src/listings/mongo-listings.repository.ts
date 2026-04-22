import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import type { ListingDto } from './dto/listing.dto';
import { ListingsRepository } from './listings.repository';
import { ListingRecord, type ListingDocument } from './schemas/listing.schema';

@Injectable()
export class MongoListingsRepository implements ListingsRepository {
  constructor(
    @InjectModel(ListingRecord.name)
    private readonly listingModel: Model<ListingDocument>,
  ) {}

  async findAll(): Promise<ListingDto[]> {
    const documents = await this.listingModel
      .find()
      .sort({ updatedAt: -1 })
      .lean<ListingDto[]>()
      .exec();

    return documents.map((document) => this.stripMongoFields(document));
  }

  async findById(id: string): Promise<ListingDto | null> {
    const document = await this.listingModel
      .findOne({ id })
      .lean<ListingDto | null>()
      .exec();

    return document ? this.stripMongoFields(document) : null;
  }

  async create(listing: ListingDto): Promise<ListingDto> {
    const created = await this.listingModel.create(listing);

    return this.stripMongoFields(
      created.toObject<ListingDto>({
        versionKey: false,
      }),
    );
  }

  async update(id: string, listing: ListingDto): Promise<ListingDto> {
    const updated = await this.listingModel
      .findOneAndUpdate({ id }, listing, {
        new: true,
        upsert: false,
      })
      .lean<ListingDto | null>()
      .exec();

    if (!updated) {
      throw new Error(`Listing ${id} not found during update.`);
    }

    return this.stripMongoFields(updated);
  }

  async delete(id: string): Promise<void> {
    await this.listingModel.deleteOne({ id }).exec();
  }

  private stripMongoFields(document: ListingDto & { _id?: unknown }) {
    const { _id, ...listing } = document;

    return {
      ...listing,
      photos: listing.photos ?? [],
    };
  }
}
