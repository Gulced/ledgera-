import type { ListingDto } from './dto/listing.dto';

export abstract class ListingsRepository {
  abstract findAll(): Promise<ListingDto[]>;
  abstract findById(id: string): Promise<ListingDto | null>;
  abstract create(listing: ListingDto): Promise<ListingDto>;
  abstract update(id: string, listing: ListingDto): Promise<ListingDto>;
  abstract delete(id: string): Promise<void>;
}
