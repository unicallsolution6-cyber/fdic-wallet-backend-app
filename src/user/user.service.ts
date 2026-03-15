import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { EmailService } from '../email/email.service';
import { SupabaseService } from '../config/supabase.service';
import { hashPassword, comparePassword, generateResetToken } from '../utils/password.util';
import { generateToken } from '../utils/jwt.util';
import { extname } from 'path';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private supabaseService: SupabaseService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'CANCELED' || user.status === 'INACTIVE' || user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account is not active');
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: 'USER',
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        balance: user.balance,
        status: user.status,
        accountNumber: user.accountNumber,
        routingNumber: user.routingNumber,
        helplineNumber: user.helplineNumber,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a reset link will be sent' };
    }

    const resetToken = generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await this.prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
        resetToken
      );
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }

    return {
      message: 'If the email exists, a reset link will be sent',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Password reset successful' };
  }

  async getDashboard(userId: string) {
    const [user, transactionStats, recentTransactions, documentCount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          balance: true,
          status: true,
          withdrawalTiming: true,
          accountNumber: true,
          routingNumber: true,
          helplineNumber: true,
        },
      }),
      this.prisma.transaction.aggregate({
        where: { userId },
        _sum: {
          amount: true,
        },
        _count: true,
      }),
      this.prisma.transaction.findMany({
        where: { userId },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      }),
      this.prisma.document.count({
        where: { userId },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const totalWithdrawals = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: 'WITHDRAWAL',
      },
      _sum: {
        amount: true,
      },
    });

    const totalDeposits = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: 'DEPOSIT',
      },
      _sum: {
        amount: true,
      },
    });

    return {
      user,
      stats: {
        totalTransactions: transactionStats._count,
        totalWithdrawals: totalWithdrawals._sum.amount || 0,
        totalDeposits: totalDeposits._sum.amount || 0,
        documentCount,
      },
      recentTransactions,
    };
  }

  async getTransactions(userId: string) {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return transactions;
  }

  async withdraw(userId: string, amount: number, method: 'BANK' | 'PAYPAL', timing: string, metadata: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const balanceBefore = user.balance;
    const balanceAfter = user.balance - amount;

    // Calculate estimated completion based on timing
    const timingMap = {
      'HOURS_24': 24,
      'DAYS_3': 72,
      'DAYS_7': 168,
      'DAYS_10': 240,
    };

    const hours = timingMap[timing] || 24;
    const estimatedCompletion = new Date(Date.now() + hours * 60 * 60 * 1000);

    // Create transaction and update balance in a transaction
    const [transaction] = await this.prisma.$transaction([
      this.prisma.transaction.create({
        data: {
          userId,
          type: 'WITHDRAWAL',
          amount,
          status: 'PENDING',
          withdrawalMethod: method,
          withdrawalTiming: timing as any,
          estimatedCompletion,
          balanceBefore,
          balanceAfter,
          metadata,
          description: `Withdrawal via ${method}`,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          balance: balanceAfter,
        },
      }),
    ]);

    return {
      message: 'Withdrawal successful',
      transaction,
      newBalance: balanceAfter,
      estimatedCompletion,
    };
  }

  async uploadDocument(userId: string, file: Express.Multer.File, documentType?: string) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Generate unique filename
    const randomName = Array(32)
      .fill(null)
      .map(() => Math.round(Math.random() * 16).toString(16))
      .join('');
    const fileName = `${userId}/${randomName}${extname(file.originalname)}`;

    // Upload to Supabase Storage
    const fileUrl = await this.supabaseService.uploadFile(file, fileName);

    const document = await this.prisma.document.create({
      data: {
        userId,
        documentType: documentType as any || 'OTHER',
        fileName: file.originalname,
        fileUrl,
        fileType: file.mimetype,
        fileSize: file.size,
        status: 'PENDING',
      },
    });

    return {
      message: 'Document uploaded successfully',
      document,
    };
  }

  async getDocuments(userId: string) {
    const documents = await this.prisma.document.findMany({
      where: { userId },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    return documents;
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        balance: true,
        accountNumber: true,
        routingNumber: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, profileData: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: any = {};

    if (profileData.firstName) updateData.firstName = profileData.firstName;
    if (profileData.lastName) updateData.lastName = profileData.lastName;
    if (profileData.email) updateData.email = profileData.email;
    if (profileData.accountNumber) updateData.accountNumber = profileData.accountNumber;
    if (profileData.routingNumber) updateData.routingNumber = profileData.routingNumber;

    if (profileData.password) {
      updateData.password = await hashPassword(profileData.password);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        balance: true,
        accountNumber: true,
        routingNumber: true,
      },
    });

    return updatedUser;
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({ where: { id: userId } });

    return { message: 'Account deleted successfully' };
  }

  async getBalanceOverview(userId: string) {
    const [approvedAmount, reviewAmount, pendingAmount, cancelledAmount] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'DEPOSIT',
          status: 'APPROVED',
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'DEPOSIT',
          status: 'REVIEW',
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'DEPOSIT',
          status: 'PENDING',
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'DEPOSIT',
          status: 'CANCELLED',
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    return {
      approvedAmount: approvedAmount._sum.amount || 0,
      reviewAmount: reviewAmount._sum.amount || 0,
      pendingAmount: pendingAmount._sum.amount || 0,
      cancelledAmount: cancelledAmount._sum.amount || 0,
    };
  }

  async sendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const verificationToken = generateResetToken();
    const verificationExpiry = new Date(Date.now() + 86400000); // 24 hours

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      },
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
        verificationToken
      );
    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw new BadRequestException('Failed to send verification email');
    }

    return {
      message: 'Verification email sent successfully',
    };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    return {
      message: 'Email verified successfully',
    };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return { message: 'If the email exists, a verification link will be sent' };
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const verificationToken = generateResetToken();
    const verificationExpiry = new Date(Date.now() + 86400000); // 24 hours

    await this.prisma.user.update({
      where: { email },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      },
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
        verificationToken
      );
    } catch (error) {
      console.error('Failed to send verification email:', error);
    }

    return {
      message: 'Verification email sent successfully',
    };
  }
}
