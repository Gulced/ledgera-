import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentsModule } from '../agents/agents.module';
import { MongoTransactionsRepository } from './mongo-transactions.repository';
import {
  TransactionRecord,
  TransactionSchema,
} from './schemas/transaction.schema';
import { TransactionsController } from './transactions.controller';
import { TransactionsRepository } from './transactions.repository';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [
    AgentsModule,
    MongooseModule.forFeature([
      {
        name: TransactionRecord.name,
        schema: TransactionSchema,
      },
    ]),
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    {
      provide: TransactionsRepository,
      useClass: MongoTransactionsRepository,
    },
  ],
  exports: [TransactionsService],
})
export class TransactionsModule {}
