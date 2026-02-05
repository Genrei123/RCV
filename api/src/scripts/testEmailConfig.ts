/**
 * Test script to verify email configuration
 * 
 * Usage:
 * 1. Make sure your .env file is configured with NODEMAILER_USER and NODEMAILER_PASS
 * 2. Run: npx ts-node src/scripts/testEmailConfig.ts
 */

import dotenv from 'dotenv';
import { sendMail } from '../utils/nodemailer';
import nodemailer_transporter from '../utils/nodemailer';

dotenv.config();

async function testEmailConfiguration() {
  console.log('=== Email Configuration Test ===\n');

  // Check environment variables
  console.log('1. Checking environment variables...');
  const user = process.env.NODEMAILER_USER;
  const pass = process.env.NODEMAILER_PASS;
  const frontendUrl = process.env.FRONTEND_URL;

  if (!user || !pass) {
    console.error('❌ ERROR: NODEMAILER_USER or NODEMAILER_PASS not set in .env file');
    console.log('\nPlease add these to your .env file:');
    console.log('NODEMAILER_USER="your-email@gmail.com"');
    console.log('NODEMAILER_PASS="your-gmail-app-password"');
    process.exit(1);
  }

  console.log(`✓ NODEMAILER_USER: ${user}`);
  console.log(`✓ NODEMAILER_PASS: ${'*'.repeat(pass.length)} (hidden)`);
  console.log(`✓ FRONTEND_URL: ${frontendUrl || 'Not set (using default)'}\n`);

  // Test SMTP connection
  console.log('2. Testing SMTP connection...');
  try {
    await nodemailer_transporter.verify();
    console.log('✓ SMTP connection successful!\n');
  } catch (error: any) {
    console.error('❌ SMTP connection failed:');
    console.error(error.message);
    console.log('\nCommon issues:');
    console.log('- If using Gmail, make sure you are using an App Password, not your regular password');
    console.log('- Enable 2FA on your Google account and generate an App Password');
    console.log('- Check that your email and password are correct');
    process.exit(1);
  }

  // Send test email
  console.log('3. Sending test email...');
  const testEmailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .success { color: #4caf50; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Email Configuration Test</h1>
        </div>
        <div class="content">
          <p class="success">Success! Your email configuration is working correctly.</p>
          <p>This is a test email from the RCV Platform to verify that your email service is configured properly.</p>
          <p><strong>Configuration Details:</strong></p>
          <ul>
            <li>Email Service: Gmail SMTP</li>
            <li>From Address: ${user}</li>
            <li>Timestamp: ${new Date().toLocaleString()}</li>
          </ul>
          <p>If you received this email, your email notification system is ready to use!</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendMail(
      user, // Send test email to yourself
      '✅ RCV Platform - Email Configuration Test',
      testEmailHtml
    );
    console.log(`✓ Test email sent to: ${user}\n`);
  } catch (error: any) {
    console.error('❌ Failed to send test email:');
    console.error(error.message);
    process.exit(1);
  }

  console.log('=== All Tests Passed! ===');
  console.log('\nYour email configuration is working correctly.');
  console.log(`Check your inbox at ${user} for the test email.`);
  console.log('(Don\'t forget to check spam/junk folder if you don\'t see it)\n');

  process.exit(0);
}

// Run the test
testEmailConfiguration().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
