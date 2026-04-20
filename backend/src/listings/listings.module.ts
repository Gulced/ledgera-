import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentsModule } from '../agents/agents.module';
import { ListingsController } from './listings.controller';
import { ListingAssistantService } from './listing-assistant.service';
import { ListingsRepository } from './listings.repository';
import { ListingsService } from './listings.service';
import { MongoListingsRepository } from './mongo-listings.repository';
import { ListingRecord, ListingSchema } from './schemas/listing.schema';

@Module({
  imports: [
    AgentsModule,
    MongooseModule.forFeature([
      {
        name: ListingRecord.name,
        schema: ListingSchema,
      },
    ]),
  ],
  controllers: [ListingsController],
  providers: [
    ListingsService,
    ListingAssistantService,
    {
      provide: ListingsRepository,
      useClass: MongoListingsRepository,
    },
  ],
  exports: [ListingsService],
})
export class ListingsModule {}
