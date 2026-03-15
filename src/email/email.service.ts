import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { verifyEmailTemplate } from './templates/verify-email.template';
import { resetPasswordTemplate } from './templates/reset-password.template';
import { newAccountTemplate } from './templates/new-account.template';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendVerificationEmail(email: string, name: string, verificationToken: string) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    await this.transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'FDIC Secure Wallet'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Verify Your Email Address - FDIC Secure Wallet',
      html: verifyEmailTemplate(name, verificationUrl),
    });
  }

  async sendPasswordResetEmail(email: string, name: string, resetToken: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await this.transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'FDIC Secure Wallet'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset Your Password - FDIC Secure Wallet',
      html: resetPasswordTemplate(name, resetUrl),
    });
  }

  async sendNewAccountEmail(email: string, name: string, password: string, isAdmin: boolean = false) {
    const loginUrl = isAdmin
      ? `${process.env.FRONTEND_URL}/admin/login`
      : `${process.env.FRONTEND_URL}/login`;

    await this.transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'FDIC Secure Wallet'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your New Account - FDIC Secure Wallet',
      html: newAccountTemplate(name, email, password, loginUrl, isAdmin),
    });
  }

  async sendEmail(to: string, subject: string, html: string) {
    await this.transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'FDIC Secure Wallet'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  }
}
