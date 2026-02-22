import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Query,
} from '@nestjs/common';
import { TransferService } from './transfer.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { TransferFundsDto } from './dto/transfer-funds.dto';
import {
  ApiResponse,
  PaginatedResponse,
} from 'src/common/dtos/api-response.dto';

@Controller('transfers')
@UseGuards(JwtAuthGuard)
export class TransferController {
  constructor(private transferService: TransferService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async transferFunds(
    @Request() req,
    @Body() transferFundsDto: TransferFundsDto,
  ): Promise<ApiResponse> {
    const senderUserId = req.user.sub;
    const result = await this.transferService.transferFundsByUserId(
      senderUserId,
      transferFundsDto.receiverWalletId,
      transferFundsDto.amount,
      transferFundsDto.description,
    );
    return {
      message: 'Transfer successful',
      data: result,
    };
  }

  @Get()
  async getUserTransfers(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ): Promise<PaginatedResponse> {
    const userId = req.user.sub;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const transfers = await this.transferService.getUserTransfers(userId);
    const total = transfers.length;
    const totalPages = Math.ceil(total / limitNum);
    const startIdx = (pageNum - 1) * limitNum;
    const items = transfers.slice(startIdx, startIdx + limitNum);

    return {
      message: 'User transfers retrieved successfully',
      data: {
        transfers: items,
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    };
  }
}
