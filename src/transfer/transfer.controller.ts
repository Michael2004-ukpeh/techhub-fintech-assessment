import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { TransferService } from './transfer.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { TransferFundsDto } from './dto/transfer-funds.dto';

@Controller('transfers')
@UseGuards(JwtAuthGuard)
export class TransferController {
  constructor(private transferService: TransferService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async transferFunds(
    @Request() req,
    @Body() transferFundsDto: TransferFundsDto,
  ) {
    const senderUserId = req.user.sub;
    return this.transferService.transferFundsByUserId(
      senderUserId,
      transferFundsDto.receiverWalletId,
      transferFundsDto.amount,
      transferFundsDto.description,
    );
  }

  @Get()
  async getUserTransfers(@Request() req) {
    const userId = req.user.sub;
    return this.transferService.getUserTransfers(userId);
  }
}
