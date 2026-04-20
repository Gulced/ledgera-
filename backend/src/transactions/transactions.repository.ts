import type { TransactionDto } from './dto/transaction.dto';

export abstract class TransactionsRepository {
  abstract findAll(): Promise<TransactionDto[]>;
  abstract findById(id: string): Promise<TransactionDto | null>;
  abstract create(transaction: TransactionDto): Promise<TransactionDto>;
  abstract update(id: string, transaction: TransactionDto): Promise<TransactionDto>;
  abstract delete(id: string): Promise<void>;
}
