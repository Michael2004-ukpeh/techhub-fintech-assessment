import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private transactionService: TransactionService) {}

  @Get('wallet/:walletId')
  async getWalletTransactions(@Param('walletId') walletId: string) {
    return this.transactionService.getWalletTransactions(walletId);
  }

  @Get(':id')
  async getTransactionById(@Param('id') transactionId: string) {
    return this.transactionService.getTransactionById(transactionId);
  }

  @Get('reference/:reference')
  async getTransactionsByReference(@Param('reference') reference: string) {
    return this.transactionService.getTransactionsByReference(reference);
  }
}
