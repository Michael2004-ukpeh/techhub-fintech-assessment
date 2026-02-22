import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { WithdrawWalletDto } from './dto/withdraw-wallet.dto';
import { ApiResponse } from 'src/common/dtos/api-response.dto';

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createWallet(@Request() req): Promise<ApiResponse> {
    const userId = req.user.sub;
    const wallet = await this.walletService.createWallet(userId);
    return {
      message: 'Wallet created successfully',
      data: wallet,
    };
  }

  @Get()
  async getWallet(@Request() req): Promise<ApiResponse> {
    const userId = req.user.sub;
    const wallet = await this.walletService.getWalletByUserId(userId);
    return {
      message: 'Wallet retrieved successfully',
      data: wallet,
    };
  }

  @Post('fund')
  async fundWallet(
    @Request() req,
    @Body() fundWalletDto: FundWalletDto,
  ): Promise<ApiResponse> {
    const userId = req.user.sub;
    const result = await this.walletService.fundWalletByUserId(
      userId,
      fundWalletDto.amount,
      fundWalletDto.description,
    );
    return {
      message: 'Wallet funded successfully',
      data: result,
    };
  }

  @Post('withdraw')
  async withdrawFromWallet(
    @Request() req,
    @Body() withdrawWalletDto: WithdrawWalletDto,
  ): Promise<ApiResponse> {
    const userId = req.user.sub;
    const result = await this.walletService.withdrawFromWalletByUserId(
      userId,
      withdrawWalletDto.amount,
      withdrawWalletDto.description,
    );
    return {
      message: 'Withdrawal successful',
      data: result,
    };
  }

  @Delete()
  async deleteWallet(@Request() req): Promise<ApiResponse> {
    const userId = req.user.sub;
    await this.walletService.deleteWalletByUserId(userId);
    return {
      message: 'Wallet deleted successfully',
      data: null,
    };
  }
}
