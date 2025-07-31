export const generateVerifyAccountEmailTemplate = (
  username: string,
  otp: string,
): { subject: string; html: string } => ({
  subject: `Welcome to Eventify, ${username}! Please Verify Your Email`,
  html: `
    <div style="max-width: 500px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; line-height: 1.6;">
      
      <!-- Header -->
      <div style="text-align: center; padding: 40px 20px 30px; background: #4CAF50; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Welcome to Eventify! 🎉</h1>
      </div>

      <!-- Content -->
      <div style="padding: 30px 20px; background: white; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin: 0 0 15px; font-size: 20px;">Hi ${username},</h2>
        
        <p style="margin: 0 0 25px; color: #555;">Thanks for signing up! Please verify your email address to activate your account and start creating amazing events.</p>
        
        <!-- OTP Code -->
        <div style="text-align: center; margin: 30px 0;">
          <p style="margin: 0 0 15px; color: #333; font-size: 16px; font-weight: 600;">Your verification code:</p>
          <div style="display: inline-block; 
                      background: #f8f9fa; 
                      border: 2px solid #4CAF50; 
                      padding: 20px 30px; 
                      border-radius: 8px; 
                      font-size: 28px; 
                      font-weight: 700; 
                      color: #4CAF50; 
                      letter-spacing: 8px; 
                      font-family: 'Courier New', monospace;">
            ${otp}
          </div>
          <p style="margin: 15px 0 0; color: #e53e3e; font-size: 14px; font-weight: 600;">
            ⏰ This code expires in 10 minutes
          </p>
        </div>

        <p style="margin: 20px 0; color: #666; font-size: 14px; text-align: center;">
          Enter this code in the verification form to complete your registration.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
        
        <p style="margin: 0; color: #888; font-size: 12px;">
          If you didn't create this account, you can ignore this email.<br>
          This is an automated message, please don't reply.
        </p>
      </div>
    </div>
  `,
});
