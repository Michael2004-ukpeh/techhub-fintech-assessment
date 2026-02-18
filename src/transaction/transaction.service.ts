import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {}

  async getWalletTransactions(walletId: string): Promise<Transaction[]> {
    const transactions = await this.transactionRepository.find({
      where: { walletId },
      order: { createdAt: 'DESC' },
    });

    return transactions;
  }

  async getTransactionById(transactionId: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }

    return transaction;
  }

  async getTransactionsByReference(reference: string): Promise<Transaction[]> {
    const transactions = await this.transactionRepository.find({
      where: { reference },
      order: { createdAt: 'DESC' },
    });

    return transactions;
  }
}
