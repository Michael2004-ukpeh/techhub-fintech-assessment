import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import {
  ApiResponse,
  PaginatedResponse,
} from 'src/common/dtos/api-response.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  async getAllUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ): Promise<PaginatedResponse> {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const users = await this.userService.getAllUsers();
    const total = users.length;
    const totalPages = Math.ceil(total / limitNum);
    const startIdx = (pageNum - 1) * limitNum;
    const items = users.slice(startIdx, startIdx + limitNum);

    return {
      message: 'Users retrieved successfully',
      data: {
        users: items,
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    };
  }

  @Get(':id')
  async getUserById(@Param('id') userId: string): Promise<ApiResponse> {
    const user = await this.userService.getUserById(userId);
    return {
      message: 'User retrieved successfully',
      data: user,
    };
  }
}
