import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import {
  ApiResponse,
  PaginatedResponse,
} from 'src/common/dtos/api-response.dto';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private transactionService: TransactionService) {}

  @Get('wallet/:walletId')
  async getWalletTransactions(
    @Param('walletId') walletId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ): Promise<PaginatedResponse> {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const transactions =
      await this.transactionService.getWalletTransactions(walletId);
    const total = transactions.length;
    const totalPages = Math.ceil(total / limitNum);
    const startIdx = (pageNum - 1) * limitNum;
    const items = transactions.slice(startIdx, startIdx + limitNum);

    return {
      message: 'Wallet transactions retrieved successfully',
      data: {
        transactions: items,
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    };
  }

  @Get(':id')
  async getTransactionById(
    @Param('id') transactionId: string,
  ): Promise<ApiResponse> {
    const transaction =
      await this.transactionService.getTransactionById(transactionId);
    return {
      message: 'Transaction retrieved successfully',
      data: transaction,
    };
  }

  @Get('reference/:reference')
  async getTransactionsByReference(
    @Param('reference') reference: string,
  ): Promise<ApiResponse> {
    const transactions =
      await this.transactionService.getTransactionsByReference(reference);
    return {
      message: 'Transactions retrieved successfully',
      data: transactions,
    };
  }
}
