export const newAccountTemplate = (
  name: string,
  email: string,
  password: string,
  loginUrl: string,
  isAdmin: boolean = false
): string => {
  const accountType = isAdmin ? 'Admin' : 'User';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your New Account</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">
                🔐 FDIC SECURE WALLET
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">
                Welcome to FDIC Secure Wallet!
              </h2>
              <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                Hi ${name},
              </p>
              <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 30px 0;">
                A new <strong>${accountType}</strong> account has been created for you. Below are your login credentials:
              </p>

              <!-- Credentials Box -->
              <div style="background-color: #f8f9fa; border: 2px solid #667eea; border-radius: 8px; padding: 25px; margin: 20px 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 10px 0;">
                      <p style="color: #666666; font-size: 14px; margin: 0 0 5px 0;">Email Address:</p>
                      <p style="color: #333333; font-size: 16px; font-weight: bold; margin: 0;">
                        ${email}
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0;">
                      <p style="color: #666666; font-size: 14px; margin: 0 0 5px 0;">Temporary Password:</p>
                      <p style="color: #333333; font-size: 18px; font-weight: bold; font-family: 'Courier New', monospace; margin: 0; background-color: #ffffff; padding: 10px; border-radius: 4px; display: inline-block;">
                        ${password}
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0;">
                      <p style="color: #666666; font-size: 14px; margin: 0 0 5px 0;">Account Type:</p>
                      <p style="color: #333333; font-size: 16px; font-weight: bold; margin: 0;">
                        ${accountType}
                      </p>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                <p style="color: #856404; font-size: 14px; margin: 0; line-height: 20px;">
                  <strong>⚠️ Important Security Notice:</strong><br>
                  For your security, please change this temporary password immediately after your first login.
                </p>
              </div>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${loginUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                      Login to Your Account
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #999999; font-size: 14px; line-height: 20px; margin: 30px 0 0 0;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #667eea; font-size: 14px; word-break: break-all; margin: 10px 0 0 0;">
                ${loginUrl}
              </p>

              <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;">

              <h3 style="color: #333333; font-size: 18px; margin: 0 0 15px 0;">
                Getting Started
              </h3>
              <ul style="color: #666666; font-size: 14px; line-height: 22px; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Login using your email and temporary password</li>
                <li style="margin-bottom: 8px;">Change your password to something secure and memorable</li>
                ${isAdmin ?
                  '<li style="margin-bottom: 8px;">Access the admin dashboard to manage users and transactions</li>' :
                  '<li style="margin-bottom: 8px;">Complete your profile information</li><li style="margin-bottom: 8px;">Upload required documents for verification</li><li style="margin-bottom: 8px;">Start managing your wallet transactions</li>'
                }
              </ul>

              <p style="color: #666666; font-size: 14px; line-height: 20px; margin: 20px 0 0 0;">
                If you have any questions or need assistance, please don't hesitate to contact our support team.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                &copy; ${new Date().getFullYear()} FDIC Secure Wallet. All rights reserved.
              </p>
              <p style="color: #999999; font-size: 12px; margin: 10px 0 0 0;">
                Your premium digital wallet experience starts here.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};
