import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { EmailService } from '../email/email.service';
import { hashPassword, comparePassword, generateResetToken } from '../utils/password.util';
import { generateToken } from '../utils/jwt.util';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async login(email: string, password: string) {
    const admin = await this.prisma.admin.findUnique({ where: { email } });

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await comparePassword(password, admin.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = generateToken({
      id: admin.id,
      email: admin.email,
      role: 'ADMIN',
    });

    return {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    };
  }

  async forgotPassword(email: string) {
    const admin = await this.prisma.admin.findUnique({ where: { email } });

    if (!admin) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a reset link will be sent' };
    }

    const resetToken = generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await this.prisma.admin.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(admin.email, admin.name, resetToken);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }

    return {
      message: 'If the email exists, a reset link will be sent',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const admin = await this.prisma.admin.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!admin) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await hashPassword(newPassword);

    await this.prisma.admin.update({
      where: { id: admin.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Password reset successful' };
  }

  async getUserStats() {
    const [totalUsers, approvedUsers, reviewUsers, pendingUsers, canceledUsers, totalTransactions, totalBalance] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'APPROVED' } }),
      this.prisma.user.count({ where: { status: 'REVIEW' } }),
      this.prisma.user.count({ where: { status: 'PENDING' } }),
      this.prisma.user.count({ where: { status: 'CANCELED' } }),
      this.prisma.transaction.count(),
      this.prisma.user.aggregate({
        _sum: {
          balance: true,
        },
      }),
    ]);

    return {
      totalUsers,
      approvedUsers,
      reviewUsers,
      pendingUsers,
      canceledUsers,
      totalTransactions,
      totalBalance: totalBalance._sum.balance || 0,
    };
  }

  async getAllUsers(status?: string) {
    const where = status ? { status: status as any } : {};

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        balance: true,
        accountNumber: true,
        routingNumber: true,
        helplineNumber: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            transactions: true,
            documents: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users;
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        documents: {
          orderBy: {
            uploadedAt: 'desc',
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async createUser(userData: any) {
    const { email, password, firstName, lastName } = userData;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const hashedPassword = await hashPassword(password);
    const initialBalance = userData.balance || 0;

    // Determine account status
    const accountStatus = userData.status || 'PENDING';

    // Create user and deposit transaction in a transaction
    const result = await this.prisma.$transaction(async (prisma) => {
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          status: accountStatus,
          balance: initialBalance,
          accountNumber: userData.accountNumber,
          routingNumber: userData.routingNumber,
          withdrawalTiming: userData.withdrawalTiming,
          helplineNumber: userData.helplineNumber,
          isEmailVerified: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          balance: true,
          accountNumber: true,
          routingNumber: true,
          helplineNumber: true,
          createdAt: true,
        },
      });

      // Create deposit transaction if initial balance is greater than 0
      if (initialBalance > 0) {
        // Use the amountStatus from userData, default to PENDING if not provided
        const transactionStatus = userData.amountStatus || 'PENDING';

        await prisma.transaction.create({
          data: {
            userId: user.id,
            type: 'DEPOSIT',
            amount: initialBalance,
            status: transactionStatus,
            balanceBefore: 0,
            balanceAfter: initialBalance,
            description: 'Initial deposit',
          },
        });
      }

      return user;
    });

    // Send new account email with credentials
    try {
      await this.emailService.sendNewAccountEmail(
        result.email,
        `${result.firstName} ${result.lastName}`,
        password, // Send the original (unhashed) password
        false, // isAdmin = false
      );
    } catch (error) {
      console.error('Failed to send new account email:', error);
    }

    return result;
  }

  async updateUser(id: string, userData: any) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: any = {};

    if (userData.firstName) updateData.firstName = userData.firstName;
    if (userData.lastName) updateData.lastName = userData.lastName;
    if (userData.email) updateData.email = userData.email;
    if (userData.status) updateData.status = userData.status;
    if (userData.balance !== undefined) updateData.balance = userData.balance;
    if (userData.accountNumber) updateData.accountNumber = userData.accountNumber;
    if (userData.routingNumber) updateData.routingNumber = userData.routingNumber;
    if (userData.withdrawalTiming) updateData.withdrawalTiming = userData.withdrawalTiming;
    if (userData.helplineNumber !== undefined) updateData.helplineNumber = userData.helplineNumber;

    if (userData.password) {
      updateData.password = await hashPassword(userData.password);
    }

    // Handle updating existing deposit statuses
    if (userData.depositStatuses && Array.isArray(userData.depositStatuses)) {
      const updatePromises = userData.depositStatuses.map((depositStatus: { id: string; status: string }) => {
        return this.prisma.transaction.update({
          where: { id: depositStatus.id },
          data: { status: depositStatus.status as any },
        });
      });

      await Promise.all(updatePromises);
    }

    // If admin is increasing the user's balance, create corresponding DEPOSIT transactions
    const isBalanceProvided = Object.prototype.hasOwnProperty.call(userData, 'balance');
    const isIncrease = isBalanceProvided && typeof userData.balance === 'number' && userData.balance > user.balance;

    if (isIncrease) {
      const newBalance = userData.balance as number;

      // Handle additional amounts with their individual statuses
      const additionalAmounts = userData.additionalAmounts || [];

      console.log('Additional amounts received:', additionalAmounts);

      // If there are additional amounts, create separate transactions for each
      if (additionalAmounts.length > 0) {
        let runningBalance = user.balance;

        const transactionPromises = additionalAmounts.map((amountData: { amount: number; status: string }) => {
          const balanceBefore = runningBalance;
          runningBalance += amountData.amount;

          console.log('Creating transaction with:', {
            userId: id,
            type: 'DEPOSIT',
            amount: amountData.amount,
            status: amountData.status,
            balanceBefore: balanceBefore,
            balanceAfter: runningBalance,
            description: 'Admin credit',
          });

          return this.prisma.transaction.create({
            data: {
              userId: id,
              type: 'DEPOSIT',
              amount: amountData.amount,
              status: amountData.status as any,
              balanceBefore: balanceBefore,
              balanceAfter: runningBalance,
              description: 'Admin credit',
            },
          });
        });

        const [updatedUser] = await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id },
            data: { ...updateData, balance: newBalance },
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
              updatedAt: true,
            },
          }),
          ...transactionPromises,
        ]);

        return updatedUser;
      } else {
        // Single transaction for the balance increase
        const amountDelta = newBalance - user.balance;

        const [updatedUser] = await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id },
            data: { ...updateData, balance: newBalance },
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
              updatedAt: true,
            },
          }),
          this.prisma.transaction.create({
            data: {
              userId: id,
              type: 'DEPOSIT',
              amount: amountDelta,
              status: 'APPROVED',
              balanceBefore: user.balance,
              balanceAfter: newBalance,
              description: 'Admin credit',
            },
          }),
        ]);

        return updatedUser;
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
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
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({ where: { id } });

    return { message: 'User deleted successfully' };
  }

  async updateTransactionStatus(transactionId: string, status: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const validStatuses = ['APPROVED', 'REVIEW', 'PENDING', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Invalid status');
    }

    const updatedTransaction = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status: status as any },
    });

    return updatedTransaction;
  }
}
