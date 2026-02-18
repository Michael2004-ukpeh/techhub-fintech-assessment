import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { User } from 'src/user/entities/user.entity';
import { Transaction } from 'src/transaction/entities/transaction.entity';
import {
  TransactionStatus,
  TransactionType,
} from 'src/transaction/enums/transaction.enum';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private dataSource: DataSource,
  ) {}

  async createWallet(userId: string): Promise<Wallet> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const existingWallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (existingWallet) {
      throw new ConflictException('User already has a wallet');
    }

    const wallet = this.walletRepository.create({
      userId,
      balance: 0,
    });

    return await this.walletRepository.save(wallet);
  }

  async getWalletBalance(walletId: string): Promise<any> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
      relations: ['transactions'],
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    const transactions = wallet.transactions || [];
    const totalCredits = transactions
      .filter(
        (t) =>
          t.type === TransactionType.CREDIT ||
          t.type === TransactionType.TRANSFER_IN,
      )
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalDebits = transactions
      .filter(
        (t) =>
          t.type === TransactionType.DEBIT ||
          t.type === TransactionType.TRANSFER_OUT,
      )
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    return {
      walletId: wallet.id,
      userId: wallet.userId,
      balance: wallet.balance,
      totalCredits: totalCredits.toFixed(2),
      totalDebits: totalDebits.toFixed(2),
      transactionCount: transactions.length,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  async fundWallet(
    walletId: string,
    amount: number,
    description?: string,
  ): Promise<any> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      const newBalance = parseFloat(wallet.balance.toString()) + amount;
      wallet.balance = newBalance.toFixed(2) as any;

      await queryRunner.manager.save(wallet);

      const reference = uuidv4();
      const transaction = queryRunner.manager.create(Transaction, {
        walletId,
        type: TransactionType.CREDIT,
        amount: amount.toFixed(2),
        reference,
        description: description || 'Wallet funding',
        status: TransactionStatus.COMPLETED,
      });

      await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();

      return {
        message: 'Wallet funded successfully',
        walletId,
        amount: amount.toFixed(2),
        newBalance: newBalance.toFixed(2),
        reference,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async withdrawFromWallet(
    walletId: string,
    amount: number,
    description?: string,
  ): Promise<any> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      const currentBalance = parseFloat(wallet.balance.toString());

      if (currentBalance < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      const newBalance = currentBalance - amount;
      wallet.balance = newBalance.toFixed(2) as any;

      await queryRunner.manager.save(wallet);

      const reference = uuidv4();
      const transaction = queryRunner.manager.create(Transaction, {
        walletId,
        type: TransactionType.DEBIT,
        amount: amount.toFixed(2),
        reference,
        description: description || 'Wallet withdrawal',
        status: TransactionStatus.COMPLETED,
      });

      await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();

      return {
        message: 'Withdrawal successful',
        walletId,
        amount: amount.toFixed(2),
        newBalance: newBalance.toFixed(2),
        reference,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteWallet(walletId: string): Promise<any> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    const currentBalance = parseFloat(wallet.balance.toString());

    if (currentBalance > 0) {
      throw new BadRequestException(
        'Cannot delete wallet with balance. Please withdraw all funds first.',
      );
    }

    await this.walletRepository.remove(wallet);

    return {
      message: 'Wallet deleted successfully',
      walletId,
    };
  }

  async getWalletByUserId(userId: string): Promise<any> {
    const wallet = await this.walletRepository.findOne({
      where: { userId },
      relations: ['transactions'],
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found for user');
    }

    return this.getWalletBalance(wallet.id);
  }

  async fundWalletByUserId(
    userId: string,
    amount: number,
    description?: string,
  ): Promise<any> {
    const wallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found for user');
    }

    return this.fundWallet(wallet.id, amount, description);
  }

  async withdrawFromWalletByUserId(
    userId: string,
    amount: number,
    description?: string,
  ): Promise<any> {
    const wallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found for user');
    }

    return this.withdrawFromWallet(wallet.id, amount, description);
  }

  async deleteWalletByUserId(userId: string): Promise<any> {
    const wallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found for user');
    }

    return this.deleteWallet(wallet.id);
  }
}
