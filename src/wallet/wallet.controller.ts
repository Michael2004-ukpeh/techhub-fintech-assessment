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

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createWallet(@Request() req) {
    const userId = req.user.sub;
    return this.walletService.createWallet(userId);
  }

  @Get()
  async getWallet(@Request() req) {
    const userId = req.user.sub;
    return this.walletService.getWalletByUserId(userId);
  }

  @Post('fund')
  async fundWallet(@Request() req, @Body() fundWalletDto: FundWalletDto) {
    const userId = req.user.sub;
    return this.walletService.fundWalletByUserId(
      userId,
      fundWalletDto.amount,
      fundWalletDto.description,
    );
  }

  @Post('withdraw')
  async withdrawFromWallet(
    @Request() req,
    @Body() withdrawWalletDto: WithdrawWalletDto,
  ) {
    const userId = req.user.sub;
    return this.walletService.withdrawFromWalletByUserId(
      userId,
      withdrawWalletDto.amount,
      withdrawWalletDto.description,
    );
  }

  @Delete()
  async deleteWallet(@Request() req) {
    const userId = req.user.sub;
    return this.walletService.deleteWalletByUserId(userId);
  }
}
