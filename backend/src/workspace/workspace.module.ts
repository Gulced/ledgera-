import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ListingsModule } from '../listings/listings.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import {
  WorkspaceDocumentRecord,
  WorkspaceDocumentSchema,
  WorkspaceEventRecord,
  WorkspaceEventSchema,
  WorkspaceNoteRecord,
  WorkspaceNoteSchema,
  WorkspaceTaskRecord,
  WorkspaceTaskSchema,
} from './schemas/workspace.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkspaceNoteRecord.name, schema: WorkspaceNoteSchema },
      { name: WorkspaceTaskRecord.name, schema: WorkspaceTaskSchema },
      { name: WorkspaceDocumentRecord.name, schema: WorkspaceDocumentSchema },
      { name: WorkspaceEventRecord.name, schema: WorkspaceEventSchema },
    ]),
    ListingsModule,
    TransactionsModule,
  ],
  controllers: [WorkspaceController],
  providers: [WorkspaceService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
