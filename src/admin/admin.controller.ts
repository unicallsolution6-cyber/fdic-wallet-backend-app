import { Controller, Post, Get, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '../guards/auth.guard';
import { AdminGuard } from '../guards/admin.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.adminService.login(body.email, body.password);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.adminService.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.adminService.resetPassword(body.token, body.newPassword);
  }

  @Get('users/stats')
  @UseGuards(AuthGuard, AdminGuard)
  async getUserStats() {
    return this.adminService.getUserStats();
  }

  @Get('users')
  @UseGuards(AuthGuard, AdminGuard)
  async getAllUsers(@Query('status') status?: string) {
    return this.adminService.getAllUsers(status);
  }

  @Get('users/:id')
  @UseGuards(AuthGuard, AdminGuard)
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Post('users')
  @UseGuards(AuthGuard, AdminGuard)
  async createUser(@Body() userData: any) {
    return this.adminService.createUser(userData);
  }

  @Put('users/:id')
  @UseGuards(AuthGuard, AdminGuard)
  async updateUser(@Param('id') id: string, @Body() userData: any) {
    return this.adminService.updateUser(id, userData);
  }

  @Delete('users/:id')
  @UseGuards(AuthGuard, AdminGuard)
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Put('transactions/:transactionId/status')
  @UseGuards(AuthGuard, AdminGuard)
  async updateTransactionStatus(
    @Param('transactionId') transactionId: string,
    @Body() body: { status: string }
  ) {
    return this.adminService.updateTransactionStatus(transactionId, body.status);
  }
}
