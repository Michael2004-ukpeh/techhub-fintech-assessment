import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Wallet } from 'src/wallet/entities/wallet.entity';
import { Transaction } from 'src/transaction/entities/transaction.entity';
import {
  TransactionType,
  TransactionStatus,
} from '../transaction/enums/transaction.enum';
import { Transfer } from './entities/transfer.entity';
import { v4 as uuidv4 } from 'uuid';
import { from } from 'rxjs';

@Injectable()
export class TransferService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Transfer)
    private transferRepository: Repository<Transfer>,
    private dataSource: DataSource,
  ) {}

  async transferFunds(
    senderWalletId: string,
    receiverWalletId: string,
    amount: number,
    description?: string,
  ) {
    if (senderWalletId === receiverWalletId) {
      throw new BadRequestException('Sender and receiver cannot be the same');
    }

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock wallets to prevent concurrent updates
      const senderWallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: senderWalletId },
        lock: { mode: 'pessimistic_write' },
      });

      const receiverWallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: receiverWalletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!senderWallet || !receiverWallet) {
        throw new BadRequestException('Wallet not found');
      }

      const senderBalance = parseFloat(senderWallet.balance.toString());

      if (senderBalance < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      // Generate shared reference
      const reference = uuidv4();

      // Create transfer record
      const transfer = queryRunner.manager.create(Transfer, {
        senderWalletId,
        receiverWalletId,
        amount: amount.toFixed(2),
        reference,
        status: TransactionStatus.COMPLETED,
      });
      await queryRunner.manager.save(transfer);

      // Update balances
      senderWallet.balance = (senderBalance - amount).toFixed(2) as any;
      receiverWallet.balance = (
        parseFloat(receiverWallet.balance.toString()) + amount
      ).toFixed(2) as any;

      await queryRunner.manager.save([senderWallet, receiverWallet]);

      // Create ledger transactions
      const senderTx = queryRunner.manager.create(Transaction, {
        walletId: senderWalletId,
        type: TransactionType.TRANSFER_OUT,
        amount: amount.toFixed(2),
        reference,
        description: description || `Transfer to wallet ${receiverWalletId}`,
        status: TransactionStatus.COMPLETED,
      });

      const receiverTx = queryRunner.manager.create(Transaction, {
        walletId: receiverWalletId,
        type: TransactionType.TRANSFER_IN,
        amount: amount.toFixed(2),
        reference,
        description: description || `Transfer from wallet ${senderWalletId}`,
        status: TransactionStatus.COMPLETED,
      });

      await queryRunner.manager.save([senderTx, receiverTx]);

      // Commit transaction
      await queryRunner.commitTransaction();

      return transfer;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getTransferById(transferId: string): Promise<Transfer> {
    const transfer = await this.transferRepository.findOne({
      where: { id: transferId },
      relations: ['senderWallet', 'receiverWallet'],
    });

    if (!transfer) {
      throw new BadRequestException('Transfer not found');
    }

    return transfer;
  }

  async getWalletTransfers(walletId: string): Promise<Transfer[]> {
    const transfers = await this.transferRepository.find({
      where: [{ senderWalletId: walletId }, { receiverWalletId: walletId }],
      relations: ['senderWallet', 'receiverWallet'],
      order: { createdAt: 'DESC' },
    });

    return transfers;
  }

  async transferFundsByUserId(
    senderUserId: string,
    receiverWalletId: string,
    amount: number,
    description?: string,
  ): Promise<Transfer> {
    const senderWallet = await this.walletRepository.findOne({
      where: { userId: senderUserId },
    });

    if (!senderWallet) {
      throw new BadRequestException('Wallet not found for sender user');
    }

    return this.transferFunds(
      senderWallet.id,
      receiverWalletId,
      amount,
      description,
    );
  }

  async getUserTransfers(userId: string): Promise<Transfer[]> {
    const userWallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!userWallet) {
      throw new BadRequestException('Wallet not found for user');
    }

    return this.getWalletTransfers(userWallet.id);
  }
}
