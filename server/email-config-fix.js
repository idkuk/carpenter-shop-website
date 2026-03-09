// Email Configuration Fix for Production Deployment
// This file helps debug and fix email issues on Render/Vercel

const nodemailer = require('nodemailer');

// Test email configuration
const testEmailConfig = async () => {
  console.log('Testing email configuration...');
  
  // For Gmail (most common option)
  const gmailConfig = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };

  // For SendGrid (recommended for production)
  const sendgridConfig = {
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY
    }
  };

  // For Ethereal (testing only)
  const etherealConfig = {
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: process.env.ETHEREAL_USER,
      pass: process.env.ETHEREAL_PASS
    }
  };

  let config;
  let serviceName;

  if (process.env.SMTP_HOST?.includes('gmail')) {
    config = gmailConfig;
    serviceName = 'Gmail';
  } else if (process.env.SMTP_HOST?.includes('sendgrid')) {
    config = sendgridConfig;
    serviceName = 'SendGrid';
  } else if (process.env.SMTP_HOST?.includes('ethereal')) {
    config = etherealConfig;
    serviceName = 'Ethereal';
  } else if (process.env.SMTP_HOST) {
    config = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    };
    serviceName = 'Custom SMTP';
  } else {
    console.log('❌ No email configuration found');
    return false;
  }

  try {
    const transporter = nodemailer.createTransporter(config);
    await transporter.verify();
    console.log(`✅ ${serviceName} email configuration is valid`);
    return true;
  } catch (error) {
    console.log(`❌ ${serviceName} email configuration failed:`, error.message);
    return false;
  }
};

// Generate test email
const sendTestEmail = async () => {
  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };

  const transporter = nodemailer.createTransporter(config);
  
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.TEST_EMAIL || process.env.SMTP_USER,
      subject: '🧪 Test Email from Carpenter Shop',
      text: 'This is a test email to verify your email configuration works.',
      html: '<h2>Test Email</h2><p>This is a test email to verify your email configuration works.</p>'
    });
    
    console.log('✅ Test email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.log('❌ Test email failed:', error.message);
    return false;
  }
};

module.exports = { testEmailConfig, sendTestEmail };
