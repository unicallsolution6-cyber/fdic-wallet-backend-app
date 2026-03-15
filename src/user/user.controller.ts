import { Controller, Post, Get, Put, Delete, Body, UseGuards, Request, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { AuthGuard } from '../guards/auth.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.userService.login(body.email, body.password);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.userService.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.userService.resetPassword(body.token, body.newPassword);
  }

  @Post('send-verification-email')
  @UseGuards(AuthGuard)
  async sendVerificationEmail(@Request() req) {
    return this.userService.sendVerificationEmail(req.user.id);
  }

  @Post('verify-email')
  async verifyEmail(@Body() body: { token: string }) {
    return this.userService.verifyEmail(body.token);
  }

  @Post('resend-verification-email')
  async resendVerificationEmail(@Body() body: { email: string }) {
    if (!body.email) {
      throw new Error('Email is required');
    }
    return this.userService.resendVerificationEmail(body.email);
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  async getProfile(@Request() req) {
    return this.userService.getProfile(req.user.id);
  }

  @Put('profile')
  @UseGuards(AuthGuard)
  async updateProfile(@Request() req, @Body() profileData: any) {
    return this.userService.updateProfile(req.user.id, profileData);
  }

  @Delete('account')
  @UseGuards(AuthGuard)
  async deleteAccount(@Request() req) {
    return this.userService.deleteAccount(req.user.id);
  }

  @Get('dashboard')
  @UseGuards(AuthGuard)
  async getDashboard(@Request() req) {
    return this.userService.getDashboard(req.user.id);
  }

  @Get('balance-overview')
  @UseGuards(AuthGuard)
  async getBalanceOverview(@Request() req) {
    return this.userService.getBalanceOverview(req.user.id);
  }

  @Get('transactions')
  @UseGuards(AuthGuard)
  async getTransactions(@Request() req) {
    return this.userService.getTransactions(req.user.id);
  }

  @Post('withdraw/bank')
  @UseGuards(AuthGuard)
  async withdrawBank(@Request() req, @Body() body: { amount: number; timing: string; bankDetails: any }) {
    return this.userService.withdraw(req.user.id, body.amount, 'BANK', body.timing, body.bankDetails);
  }

  @Post('withdraw/paypal')
  @UseGuards(AuthGuard)
  async withdrawPaypal(@Request() req, @Body() body: { amount: number; timing: string; paypalEmail: string; firstName?: string; lastName?: string; accountUsername?: string; accountPassword?: string }) {
    return this.userService.withdraw(req.user.id, body.amount, 'PAYPAL', body.timing, {
      paypalEmail: body.paypalEmail,
      firstName: body.firstName,
      lastName: body.lastName,
      accountUsername: body.accountUsername,
      accountPassword: body.accountPassword,
    });
  }

  @Post('upload-document')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(@Request() req, @UploadedFile() file: Express.Multer.File, @Body() body: { documentType?: string }) {
    return this.userService.uploadDocument(req.user.id, file, body.documentType);
  }

  @Get('documents')
  @UseGuards(AuthGuard)
  async getDocuments(@Request() req) {
    return this.userService.getDocuments(req.user.id);
  }
}
