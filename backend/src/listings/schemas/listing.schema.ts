import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type ListingDocument = HydratedDocument<ListingRecord>;

@Schema({ collection: 'listings', versionKey: false })
export class ListingRecord {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  propertyRef: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, index: true })
  city: string;

  @Prop({ required: true })
  fullAddress: string;

  @Prop({ required: true })
  askingPrice: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true, default: 'active' })
  status: string;

  @Prop({ required: true, type: Array, default: [] })
  photos: Array<{
    id: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    uploadedAt: string;
    isCover: boolean;
  }>;

  @Prop({ required: true, type: Object })
  listingAgent: {
    id: string;
    name: string;
  };

  @Prop({ required: true, type: Object })
  createdBy: {
    userId: string;
    name?: string;
    role: string;
  };

  @Prop({ required: true })
  createdAt: string;

  @Prop({ required: true })
  updatedAt: string;
}

export const ListingSchema = SchemaFactory.createForClass(ListingRecord);
