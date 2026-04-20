import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import type { TransactionDto } from './dto/transaction.dto';
import { TransactionsRepository } from './transactions.repository';
import {
  TransactionRecord,
  type TransactionDocument,
} from './schemas/transaction.schema';

@Injectable()
export class MongoTransactionsRepository implements TransactionsRepository {
  constructor(
    @InjectModel(TransactionRecord.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  async findAll(): Promise<TransactionDto[]> {
    const documents = await this.transactionModel
      .find()
      .sort({ updatedAt: -1 })
      .lean<TransactionDto[]>()
      .exec();

    return documents.map((document) => this.stripMongoFields(document));
  }

  async findById(id: string): Promise<TransactionDto | null> {
    const document = await this.transactionModel
      .findOne({ id })
      .lean<TransactionDto | null>()
      .exec();

    return document ? this.stripMongoFields(document) : null;
  }

  async create(transaction: TransactionDto): Promise<TransactionDto> {
    const created = await this.transactionModel.create(transaction);

    return this.stripMongoFields(
      created.toObject<TransactionDto>({
        versionKey: false,
      }),
    );
  }

  async update(id: string, transaction: TransactionDto): Promise<TransactionDto> {
    const updated = await this.transactionModel
      .findOneAndUpdate({ id }, transaction, {
        new: true,
        upsert: false,
      })
      .lean<TransactionDto | null>()
      .exec();

    if (!updated) {
      throw new Error(`Transaction ${id} not found during update.`);
    }

    return this.stripMongoFields(updated);
  }

  private stripMongoFields(document: TransactionDto & { _id?: unknown }) {
    const { _id, ...transaction } = document;

    return transaction;
  }
}
