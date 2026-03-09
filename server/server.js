const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const https = require('https');
const querystring = require('querystring');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

app.set("trust proxy", 1);

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'change_this_secret') {
  throw new Error('JWT_SECRET is required in production');
}
const parsedResetTokenTtl = Number.parseInt(process.env.RESET_TOKEN_TTL_MINUTES || '60', 10);
const RESET_TOKEN_TTL_MINUTES = Number.isNaN(parsedResetTokenTtl) || parsedResetTokenTtl <= 0 ? 60 : parsedResetTokenTtl;
const SHOULD_EXPOSE_RESET_TOKEN = process.env.NODE_ENV !== 'production' && process.env.RESET_TOKEN_EXPOSE === 'true';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number.parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;
const EMAIL_ENABLED = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && SMTP_FROM);
const VERIFICATION_CODE_LENGTH = Number.parseInt(process.env.VERIFICATION_CODE_LENGTH || '6', 10) || 6;
const VERIFICATION_CODE_TTL_MINUTES = Number.parseInt(process.env.VERIFICATION_CODE_TTL_MINUTES || '10', 10) || 10;
const VERIFICATION_CODE_EXPOSE = process.env.NODE_ENV !== 'production' && process.env.VERIFICATION_CODE_EXPOSE === 'true';
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;
const WHATSAPP_ENABLED = Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_FROM);
const parsedMaxUploadMb = Number.parseInt(process.env.MAX_UPLOAD_FILE_MB || '15', 10);
const MAX_UPLOAD_FILE_MB = Number.isNaN(parsedMaxUploadMb) || parsedMaxUploadMb <= 0 ? 15 : parsedMaxUploadMb;
const MAX_UPLOAD_FILE_SIZE = MAX_UPLOAD_FILE_MB * 1024 * 1024;
const SHOULD_EXPOSE_VERIFICATION_CODE = process.env.NODE_ENV !== 'production' && (
  VERIFICATION_CODE_EXPOSE || (!EMAIL_ENABLED && !WHATSAPP_ENABLED)
);
const ALLOW_DEV_VERIFICATION_FALLBACK = process.env.NODE_ENV !== 'production';
const ORDER_PAYMENT_CURRENCY = 'INR';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

app.use(cors({
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  address: String,
  role: { type: String, enum: ['customer', 'admin', 'employee'], default: 'customer' },
  contactVerified: { type: Boolean, default: false },
  contactVerificationChannel: { type: String, enum: ['email', 'whatsapp'], default: 'email' },
  contactVerificationCode: String,
  contactVerificationExpires: Date,
  contactVerificationAttempts: { type: Number, default: 0 },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  category: String,
  dimensions: String,
  material: String,
  budget: Number,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'delivered', 'cancelled'],
    default: 'pending'
  },
  cancellationRequest: {
    status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
    requestedAt: Date,
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolutionNote: String
  },
  images: [String],
  notes: [{
    text: String,
    addedBy: String,
    addedAt: { type: Date, default: Date.now }
  }],
  deadline: Date,
  completedAt: Date,
  payment: {
    status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    paidAt: Date
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const inventorySchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  category: String,
  quantity: { type: Number, default: 0 },
  unit: String,
  price: Number,
  supplier: String,
  supplierContact: String,
  reorderLevel: Number,
  location: String,
  lastUpdated: { type: Date, default: Date.now }
});

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: String,
  description: String,
  price: String,
  timeline: String,
  rating: Number,
  image: String,
  features: [String],
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  type: { type: String, enum: ['order_status', 'order_update'], default: 'order_status' },
  title: String,
  message: String,
  statusFrom: String,
  statusTo: String,
  readAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Order = mongoose.model('Order', orderSchema);
const Inventory = mongoose.model('Inventory', inventorySchema);
const Service = mongoose.model('Service', serviceSchema);
const Notification = mongoose.model('Notification', notificationSchema);

const staffRoles = ['admin', 'employee'];
const orderStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'delivered', 'cancelled'];

// Helpers
const createToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  address: user.address || '',
  contactVerified: user.contactVerified !== false
});

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? undefined : numberValue;
};

const parseDate = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const parseArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch (err) {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
};

const formatStatusLabel = (value) => {
  if (!value) return '';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
const requireObjectId = (paramName) => (req, res, next) => {
  const value = req.params[paramName];
  if (!isValidObjectId(value)) {
    return res.status(400).json({ message: `${paramName} is invalid` });
  }
  next();
};
const trimTrailingSlash = (value) => value.endsWith('/') ? value.slice(0, -1) : value;
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const getResetTokenExpiry = () => new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
const getVerificationCodeExpiry = () => new Date(Date.now() + VERIFICATION_CODE_TTL_MINUTES * 60 * 1000);
let emailTransporter;

const postFormRequest = ({ hostname, path: requestPath, auth, data }) => new Promise((resolve, reject) => {
  const payload = querystring.stringify(data);
  const request = https.request({
    hostname,
    path: requestPath,
    method: 'POST',
    auth,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (response) => {
    let body = '';
    response.on('data', (chunk) => { body += chunk; });
    response.on('end', () => {
      if (response.statusCode >= 200 && response.statusCode < 300) {
        resolve(body);
      } else {
        reject(new Error(`HTTP ${response.statusCode}: ${body}`));
      }
    });
  });

  request.on('error', reject);
  request.write(payload);
  request.end();
});

const normalizePhone = (value) => {
  if (!value) return '';
  const cleaned = String(value).trim().replace(/[^+\d]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return cleaned;
  return `+${cleaned}`;
};

const createVerificationCode = () => {
  const max = 10 ** VERIFICATION_CODE_LENGTH;
  const value = crypto.randomInt(0, max);
  return String(value).padStart(VERIFICATION_CODE_LENGTH, '0');
};

const getEmailTransporter = () => {
  if (!EMAIL_ENABLED) return null;
  if (!emailTransporter) {
    emailTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });
  }
  return emailTransporter;
};

const sendResetEmail = async ({ to, resetUrl }) => {
  const transporter = getEmailTransporter();
  if (!transporter) {
    console.warn('Email not configured. Set SMTP_* env vars to enable reset emails.');
    return;
  }

  const subject = 'Reset your Carpenter Shop password';
  const text = [
    'You requested a password reset for your Carpenter Shop account.',
    `Reset your password using this link: ${resetUrl}`,
    `This link expires in ${RESET_TOKEN_TTL_MINUTES} minutes.`,
    'If you did not request this, you can ignore this email.'
  ].join('\n\n');
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Reset your password</h2>
      <p>You requested a password reset for your Carpenter Shop account.</p>
      <p><a href="${resetUrl}" style="color: #667eea;">Reset your password</a></p>
      <p>This link expires in ${RESET_TOKEN_TTL_MINUTES} minutes.</p>
      <p>If you did not request this, you can ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
    html
  });
};

const sendOrderStatusEmail = async ({ to, name, orderTitle, status }) => {
  const transporter = getEmailTransporter();
  if (!transporter) {
    console.warn('Email not configured. Set SMTP_* env vars to enable order status emails.');
    return;
  }

  const subject = `Order status update: ${orderTitle}`;
  const greetingName = name || 'Customer';
  const text = [
    `Hi ${greetingName},`,
    `Your order "${orderTitle}" status is now: ${status}.`,
    'You can log in to view full details.',
    'Thank you for choosing Carpenter Shop.'
  ].join('\n\n');
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Order status updated</h2>
      <p>Hi ${greetingName},</p>
      <p>Your order <strong>${orderTitle}</strong> status is now: <strong>${status}</strong>.</p>
      <p>You can log in to view full details.</p>
      <p>Thank you for choosing Carpenter Shop.</p>
    </div>
  `;

  await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
    html
  });
};

const sendGenericCustomerEmail = async ({ to, name, title, message }) => {
  const transporter = getEmailTransporter();
  if (!transporter) return false;

  const greetingName = name || 'Customer';
  const subject = title || 'Carpenter Shop update';
  const text = [
    `Hi ${greetingName},`,
    message || 'There is a new update in your Carpenter Shop account.',
    'Please log in for full details.'
  ].join('\n\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>${subject}</h2>
      <p>Hi ${greetingName},</p>
      <p>${message || 'There is a new update in your Carpenter Shop account.'}</p>
      <p>Please log in for full details.</p>
    </div>
  `;

  await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
    html
  });
  return true;
};

const sendWhatsAppMessage = async ({ to, body }) => {
  if (!WHATSAPP_ENABLED) {
    console.warn('WhatsApp not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM.');
    return false;
  }

  const normalizedTo = normalizePhone(to);
  if (!normalizedTo) {
    return false;
  }

  await postFormRequest({
    hostname: 'api.twilio.com',
    path: `/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    auth: `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`,
    data: {
      To: `whatsapp:${normalizedTo}`,
      From: `whatsapp:${TWILIO_WHATSAPP_FROM}`,
      Body: body
    }
  });

  return true;
};

const generateAndStoreVerificationCode = async (user, channel = 'email') => {
  const code = createVerificationCode();
  user.contactVerificationCode = hashToken(code);
  user.contactVerificationExpires = getVerificationCodeExpiry();
  user.contactVerificationAttempts = 0;
  user.contactVerificationChannel = channel;
  await user.save();
  return code;
};

const sendVerificationCode = async ({ user, channel = 'email', code }) => {
  const finalCode = code || await generateAndStoreVerificationCode(user, channel);
  const minutes = VERIFICATION_CODE_TTL_MINUTES;

  if (channel === 'whatsapp') {
    if (!user.phone) {
      throw new Error('Phone number is required for WhatsApp verification');
    }
    const sentViaWhatsapp = await sendWhatsAppMessage({
      to: user.phone,
      body: `Carpenter Shop verification code: ${finalCode}. Valid for ${minutes} minutes.`
    });
    if (!sentViaWhatsapp) {
      throw new Error('WhatsApp verification is not configured');
    }
    return finalCode;
  }

  if (!user.email) {
    throw new Error('Email is required for email verification');
  }

  const sentViaEmail = await sendGenericCustomerEmail({
    to: user.email,
    name: user.name,
    title: 'Verify your Carpenter Shop account',
    message: `Your verification code is ${finalCode}. It is valid for ${minutes} minutes.`
  });
  if (!sentViaEmail) {
    throw new Error('Email verification is not configured');
  }
  return finalCode;
};

const sendCustomerNotificationChannels = async ({ customer, title, message, sendEmail = true, sendWhatsapp = true }) => {
  if (!customer) return;

  if (sendEmail && customer.email) {
    try {
      await sendGenericCustomerEmail({
        to: customer.email,
        name: customer.name,
        title,
        message
      });
    } catch (emailError) {
      console.error('Failed to send customer notification email:', emailError);
    }
  }

  if (sendWhatsapp && customer.phone) {
    try {
      await sendWhatsAppMessage({
        to: customer.phone,
        body: `${title || 'Carpenter Shop update'}: ${message || ''}`.trim()
      });
    } catch (waError) {
      console.error('Failed to send customer WhatsApp notification:', waError);
    }
  }
};

const notifyAdmins = async ({ title, message, orderId }) => {
  const admins = await User.find({ role: 'admin' }, '_id');
  if (!admins.length) return;

  const notifications = admins.map((admin) => ({
    userId: admin._id,
    orderId,
    type: 'order_update',
    title,
    message
  }));

  await Notification.insertMany(notifications);
};

// Auth Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid authentication' });
    }

    req.user = user;
    req.token = token;
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Invalid authentication' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

// Seed Admin and Services
const seedAdmin = async () => {
  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) return;

  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_PHONE, ADMIN_ADDRESS } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_NAME || !ADMIN_PHONE) {
    console.warn('Admin seed skipped. Set ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_PHONE in .env.');
    return;
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await User.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: hashedPassword,
    phone: ADMIN_PHONE,
    address: ADMIN_ADDRESS || '',
    role: 'admin',
    contactVerified: true
  });

  console.log('Admin user seeded:', ADMIN_EMAIL);
};

const seedServices = async () => {
  const existing = await Service.find({}, 'name');
  const existingNames = new Set(existing.map((service) => service.name));
  const toInsert = sampleServices.filter((service) => !existingNames.has(service.name));

  if (toInsert.length === 0) return;

  await Service.insertMany(toInsert);
  console.log(`Sample services seeded: ${toInsert.length}`);
};

const sampleServices = [
  {
    name: 'Custom Bed Frames',
    category: 'bedroom',
    description: 'Handcrafted wooden bed frames with custom dimensions and designs.',
    price: 'Rs 15000 - Rs 50000',
    timeline: '2-4 weeks',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600',
    features: ['Solid wood construction', 'Custom sizes', 'Multiple finish options', 'Storage options']
  },
  {
    name: 'Dining Table Sets',
    category: 'dining',
    description: 'Elegant dining tables with matching chairs, perfect for family gatherings.',
    price: 'Rs 25000 - Rs 80000',
    timeline: '3-5 weeks',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=600',
    features: ['Expandable designs', 'Scratch-resistant finish', 'Custom seating', 'Various wood types']
  },
  {
    name: 'Office Desks',
    category: 'office',
    description: 'Ergonomic office desks with cable management and storage solutions.',
    price: 'Rs 12000 - Rs 40000',
    timeline: '2-3 weeks',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=600',
    features: ['Cable management', 'Adjustable height', 'Storage drawers', 'Durable finish']
  },
  {
    name: 'Wardrobes',
    category: 'storage',
    description: 'Custom-built wardrobes with optimal storage solutions and modern designs.',
    price: 'Rs 20000 - Rs 70000',
    timeline: '4-6 weeks',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=600',
    features: ['Custom compartments', 'Soft-close drawers', 'Mirror options', 'Lighting systems']
  },
  {
    name: 'Bookshelves',
    category: 'storage',
    description: 'Stylish bookshelves and display units for homes and offices.',
    price: 'Rs 8000 - Rs 30000',
    timeline: '2-4 weeks',
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1551029506-0807df4e2031?auto=format&fit=crop&w=600',
    features: ['Adjustable shelves', 'Various depths', 'Wall-mounted options', 'Multiple finishes']
  },
  {
    name: 'Coffee Tables',
    category: 'living',
    description: 'Beautiful coffee tables with storage options and unique designs.',
    price: 'Rs 6000 - Rs 25000',
    timeline: '1-3 weeks',
    rating: 4.4,
    image: 'https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?auto=format&fit=crop&w=600',
    features: ['Storage compartments', 'Various shapes', 'Glass top options', 'Casters available']
  },
  {
    name: 'Custom TV Units',
    category: 'living',
    description: 'Modern TV units with concealed storage, display shelves, and cable management.',
    price: 'Rs 18000 - Rs 60000',
    timeline: '3-5 weeks',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600',
    features: ['Cable management', 'Floating shelves', 'Soft-close drawers', 'Custom finishes']
  },
  {
    name: 'Kitchen Cabinets',
    category: 'storage',
    description: 'Modular kitchen cabinets designed for maximum storage and durable daily use.',
    price: 'Rs 30000 - Rs 120000',
    timeline: '4-7 weeks',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=600',
    features: ['Modular layout', 'Soft-close hinges', 'Moisture-resistant finish', 'Custom hardware']
  },
  {
    name: 'Outdoor Patio Set',
    category: 'living',
    description: 'Weather-treated patio furniture sets ideal for balconies, decks, and gardens.',
    price: 'Rs 22000 - Rs 75000',
    timeline: '3-6 weeks',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600',
    features: ['Weather-treated wood', 'Optional cushions', 'Compact layouts', 'Easy maintenance']
  },
  {
    name: 'Kids Study Desk',
    category: 'office',
    description: 'Compact study desks with storage and ergonomic proportions for kids.',
    price: 'Rs 9000 - Rs 28000',
    timeline: '2-4 weeks',
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=600',
    features: ['Ergonomic height', 'Storage drawers', 'Rounded edges', 'Custom colors']
  },
  {
    name: 'Entryway Shoe Bench',
    category: 'storage',
    description: 'Entry benches with hidden shoe storage to keep your foyer organized.',
    price: 'Rs 7000 - Rs 22000',
    timeline: '2-3 weeks',
    rating: 4.4,
    image: 'https://images.unsplash.com/photo-1501045661006-fcebe0257c3f?auto=format&fit=crop&w=600',
    features: ['Hidden shoe storage', 'Seat cushion option', 'Wall hooks add-on', 'Compact size']
  },
  {
    name: 'Vanity Cabinets',
    category: 'storage',
    description: 'Custom vanity cabinets with water-resistant finishes and organizer drawers.',
    price: 'Rs 16000 - Rs 55000',
    timeline: '3-5 weeks',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1564540574859-0dfb63985953?auto=format&fit=crop&w=600',
    features: ['Water-resistant finish', 'Sink cutout support', 'Drawer organizers', 'Soft-close slides']
  }
];

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/carpenter_shop';

mongoose.connect(mongoUri)
.then(async () => {
  console.log("MongoDB connected successfully");
  await seedAdmin();
  await seedServices();
})
.catch((err) => {
  console.error("MongoDB connection failed:", err);
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Carpenter Shop API is running' });
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: 'Name, email, password, and phone are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      address,
      role: 'customer',
      contactVerified: false
    });

    await user.save();

    const preferredChannel = EMAIL_ENABLED ? 'email' : ((WHATSAPP_ENABLED && user.phone) ? 'whatsapp' : 'email');
    const code = await generateAndStoreVerificationCode(user, preferredChannel);
    let deliveryMessage = 'Verification code generated.';
    let deliveryFailed = false;

    try {
      await sendVerificationCode({ user, channel: preferredChannel, code });
      deliveryMessage = preferredChannel === 'whatsapp'
        ? 'Verification code sent to your WhatsApp number.'
        : 'Verification code sent to your email.';
    } catch (sendError) {
      console.error('Failed to send verification code:', sendError);
      deliveryFailed = true;
      deliveryMessage = (SHOULD_EXPOSE_VERIFICATION_CODE || ALLOW_DEV_VERIFICATION_FALLBACK)
        ? 'Verification service is not configured, use the dev code shown below.'
        : 'Could not send verification code automatically. Please request resend from login.';
    }

    const response = {
      message: `Registration successful. ${deliveryMessage}`,
      verificationRequired: true,
      verificationChannel: preferredChannel,
      email: user.email,
      deliveryFailed
    };

    if (SHOULD_EXPOSE_VERIFICATION_CODE || (ALLOW_DEV_VERIFICATION_FALLBACK && deliveryFailed)) {
      response.devVerificationCode = code;
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.role === 'customer' && user.contactVerified === false) {
      const preferredChannel = EMAIL_ENABLED ? 'email' : ((WHATSAPP_ENABLED && user.phone) ? 'whatsapp' : 'email');
      const code = await generateAndStoreVerificationCode(user, preferredChannel);
      let deliveryFailed = false;
      let verificationMessage = '';

      try {
        await sendVerificationCode({ user, channel: preferredChannel, code });
        verificationMessage = preferredChannel === 'whatsapp'
          ? 'Verification code sent to your WhatsApp number.'
          : 'Verification code sent to your email.';
      } catch (sendError) {
        console.error('Failed to auto-send verification code during login:', sendError);
        deliveryFailed = true;
        verificationMessage = (SHOULD_EXPOSE_VERIFICATION_CODE || ALLOW_DEV_VERIFICATION_FALLBACK)
          ? 'Verification service is not configured, use the dev code shown below.'
          : 'Could not send verification code automatically. Please use resend.';
      }

      const response = {
        message: 'Please verify your account before login',
        requiresVerification: true,
        email: user.email,
        verificationChannel: user.contactVerificationChannel || preferredChannel,
        deliveryFailed,
        verificationMessage
      };

      if ((SHOULD_EXPOSE_VERIFICATION_CODE || (ALLOW_DEV_VERIFICATION_FALLBACK && deliveryFailed)) && code) {
        response.devVerificationCode = code;
      }

      return res.status(403).json(response);
    }

    const token = createToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: serializeUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


app.post('/api/auth/send-verification-code', async (req, res) => {
  try {
    const { email, channel } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'customer') {
      return res.status(400).json({ message: 'Verification is only required for customer accounts' });
    }

    if (user.contactVerified) {
      return res.json({ message: 'Account is already verified' });
    }

    const requestedChannel = channel === 'whatsapp' ? 'whatsapp' : 'email';
    const finalChannel = requestedChannel === 'whatsapp'
      ? (WHATSAPP_ENABLED && user.phone ? 'whatsapp' : (EMAIL_ENABLED ? 'email' : 'whatsapp'))
      : (EMAIL_ENABLED ? 'email' : ((WHATSAPP_ENABLED && user.phone) ? 'whatsapp' : 'email'));
    const code = await generateAndStoreVerificationCode(user, finalChannel);

    let deliveryFailed = false;
    let deliveryMessage = finalChannel === 'whatsapp'
      ? 'Verification code sent to WhatsApp.'
      : 'Verification code sent to email.';

    try {
      await sendVerificationCode({ user, channel: finalChannel, code });
    } catch (sendError) {
      console.error('Send verification code delivery error:', sendError);
      deliveryFailed = true;
      if (!ALLOW_DEV_VERIFICATION_FALLBACK) {
        throw sendError;
      }
      deliveryMessage = 'Verification service is not configured, use the dev code shown below.';
    }

    const response = {
      message: deliveryMessage,
      verificationChannel: finalChannel,
      deliveryFailed
    };

    if (SHOULD_EXPOSE_VERIFICATION_CODE || (ALLOW_DEV_VERIFICATION_FALLBACK && deliveryFailed)) {
      response.devVerificationCode = code;
    }

    res.json(response);
  } catch (error) {
    console.error('Send verification code error:', error);
    res.status(500).json({ message: 'Failed to send verification code', error: error.message });
  }
});

app.post('/api/auth/verify-contact', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and code are required' });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.contactVerified) {
      const token = createToken(user);
      return res.json({
        message: 'Account already verified',
        token,
        user: serializeUser(user)
      });
    }

    if (!user.contactVerificationCode || !user.contactVerificationExpires || user.contactVerificationExpires <= new Date()) {
      return res.status(400).json({ message: 'Verification code has expired. Request a new code.' });
    }

    const incomingHash = hashToken(String(code).trim());
    if (incomingHash !== user.contactVerificationCode) {
      user.contactVerificationAttempts = (user.contactVerificationAttempts || 0) + 1;
      if (user.contactVerificationAttempts >= 5) {
        user.contactVerificationCode = undefined;
        user.contactVerificationExpires = undefined;
      }
      await user.save();
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    user.contactVerified = true;
    user.contactVerificationCode = undefined;
    user.contactVerificationExpires = undefined;
    user.contactVerificationAttempts = 0;
    await user.save();

    const token = createToken(user);
    res.json({
      message: 'Verification successful',
      token,
      user: serializeUser(user)
    });
  } catch (error) {
    console.error('Verify contact error:', error);
    res.status(500).json({ message: 'Failed to verify account', error: error.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    let resetToken;
    let resetTokenExpiresAt;
    let resetUrl;

    if (user) {
      resetToken = crypto.randomBytes(32).toString('hex');
      resetTokenExpiresAt = getResetTokenExpiry();
      resetUrl = `${trimTrailingSlash(APP_URL)}/reset-password?token=${resetToken}`;
      user.resetPasswordToken = hashToken(resetToken);
      user.resetPasswordExpires = resetTokenExpiresAt;
      await user.save();

      try {
        await sendResetEmail({ to: user.email, resetUrl });
      } catch (sendError) {
        console.error('Failed to send reset email:', sendError);
      }
    }

    const response = {
      message: 'If an account exists, a reset link has been sent.'
    };

    res.json(response);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const tokenHash = hashToken(token);
    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset token is invalid or expired' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: serializeUser(req.user) });
});

// Admin user management
app.post('/api/users', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, password, phone, address, role } = req.body;
    const newRole = role || 'employee';

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: 'Name, email, password, and phone are required' });
    }

    if (!['employee', 'customer'].includes(newRole)) {
      return res.status(400).json({ message: 'Only employee or customer roles can be created' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      address,
      role: newRole,
      contactVerified: newRole !== 'customer'
    });

    res.status(201).json({
      message: 'User created successfully',
      user: serializeUser(user)
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/users', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const query = {};
    if (req.query.role) {
      query.role = req.query.role;
    }
    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Customer Routes
app.get('/api/customers', authMiddleware, requireRole('admin', 'employee'), async (req, res) => {
  try {
    const query = { role: 'customer' };
    if (req.query.search) {
      const search = String(req.query.search).trim();
      if (search) {
        const regex = new RegExp(escapeRegex(search), 'i');
        query.$or = [{ name: regex }, { email: regex }, { phone: regex }];
      }
    }
    const customers = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/customers/:id', authMiddleware, requireObjectId('id'), async (req, res) => {
  try {
    const customer = await User.findById(req.params.id).select('-password');
    if (!customer || customer.role !== 'customer') {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (req.user.role === 'customer' && customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/customers/:id', authMiddleware, requireObjectId('id'), async (req, res) => {
  try {
    if (req.user.role === 'customer' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updates = {};
    let contactFieldChanged = false;
    if (req.body.name) updates.name = req.body.name;
    if (req.body.phone) {
      updates.phone = req.body.phone;
      contactFieldChanged = true;
    }
    if (req.body.address) updates.address = req.body.address;

    if (req.body.email) {
      const existingUser = await User.findOne({ email: req.body.email.toLowerCase() });
      if (existingUser && existingUser._id.toString() !== req.params.id) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      updates.email = req.body.email.toLowerCase();
      contactFieldChanged = true;
    }

    if (contactFieldChanged) {
      updates.contactVerified = false;
      updates.contactVerificationCode = undefined;
      updates.contactVerificationExpires = undefined;
      updates.contactVerificationAttempts = 0;
    }

    const customer = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!customer || customer.role !== 'customer') {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/customers/:id/stats', authMiddleware, requireObjectId('id'), async (req, res) => {
  try {
    if (req.user.role === 'customer' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const orders = await Order.find({ customerId: req.params.id });
    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) => ['completed', 'delivered'].includes(o.status)).length;
    const pendingOrders = orders.filter((o) => !['completed', 'delivered', 'cancelled'].includes(o.status)).length;
    const totalSpent = orders
      .filter((o) => ['completed', 'delivered'].includes(o.status))
      .reduce((sum, o) => sum + (o.budget || 0), 0);

    res.json({ totalOrders, completedOrders, pendingOrders, totalSpent });
  } catch (error) {
    console.error('Customer stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Service Routes
app.get('/api/services', async (req, res) => {
  try {
    const query = {};
    if (req.query.category) query.category = req.query.category;
    if (req.query.active) query.active = req.query.active === 'true';
    const services = await Service.find(query).sort({ createdAt: -1 });
    res.json(services);
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/services/:id', requireObjectId('id'), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json(service);
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/services', authMiddleware, requireRole('admin'), upload.single('image'), async (req, res) => {
  try {
    const { name, category, description, price, timeline, rating, image, active } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Service name is required' });
    }

    const features = parseArray(req.body.features);
    const uploadedImage = req.file ? `/uploads/${req.file.filename}` : undefined;
    const resolvedImage = uploadedImage || image;
    const resolvedActive = active === undefined ? true : active === 'true' || active === true;
    const service = await Service.create({
      name,
      category,
      description,
      price,
      timeline,
      rating: parseNumber(rating),
      image: resolvedImage,
      features,
      active: resolvedActive
    });

    res.status(201).json({ message: 'Service created successfully', service });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/services/:id', authMiddleware, requireRole('admin'), requireObjectId('id'), upload.single('image'), async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.rating !== undefined) updates.rating = parseNumber(updates.rating);
    if (updates.features !== undefined) updates.features = parseArray(updates.features);
    if (updates.active !== undefined) {
      updates.active = updates.active === 'true' || updates.active === true;
    }
    if (req.file) {
      updates.image = `/uploads/${req.file.filename}`;
    }

    const service = await Service.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({ message: 'Service updated successfully', service });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/api/services/:id', authMiddleware, requireRole('admin'), requireObjectId('id'), async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Order Routes
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const query = {};

    if (req.user.role === 'customer') {
      query.customerId = req.user._id;
    } else if (req.query.customerId) {
      query.customerId = req.query.customerId;
    }

    if (req.query.status) query.status = req.query.status;
    if (req.query.category) query.category = req.query.category;

    let orderQuery = Order.find(query).populate('customerId', 'name email phone');

    if (req.query.limit) {
      const limit = parseInt(req.query.limit, 10);
      if (!Number.isNaN(limit)) {
        orderQuery = orderQuery.limit(limit);
      }
    }

    const orders = await orderQuery.sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/orders/customer/:customerId', authMiddleware, requireObjectId('customerId'), async (req, res) => {
  try {
    if (req.user.role === 'customer' && req.user._id.toString() !== req.params.customerId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const orders = await Order.find({ customerId: req.params.customerId })
      .populate('customerId', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/orders/:id', authMiddleware, requireObjectId('id'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customerId', 'name email phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (req.user.role === 'customer' && order.customerId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const orderCreateMulter = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return upload.array('images', 5)(req, res, next);
  }
  next();
};

app.post('/api/orders', authMiddleware, orderCreateMulter, async (req, res) => {
  try {
    const customerId = req.user.role === 'customer' ? req.user._id : req.body.customerId;

    if (!customerId) {
      return res.status(400).json({ message: 'customerId is required' });
    }

    if (!isValidObjectId(customerId)) {
      return res.status(400).json({ message: 'Valid customerId is required' });
    }

    if (req.user.role !== 'customer') {
      const customer = await User.findById(customerId);
      if (!customer || customer.role !== 'customer') {
        return res.status(400).json({ message: 'Valid customerId is required' });
      }
    }

    if (!req.body.title) {
      return res.status(400).json({ message: 'Order title is required' });
    }

    const uploadedImages = (req.files || []).map((file) => `/uploads/${file.filename}`);
    const existingImages = parseArray(req.body.images);

    const status = orderStatuses.includes(req.body.status) && req.user.role !== 'customer'
      ? req.body.status
      : 'pending';
    const budget = parseNumber(req.body.budget);

    const order = new Order({
      customerId,
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      dimensions: req.body.dimensions,
      material: req.body.material,
      budget,
      status,
      images: [...existingImages, ...uploadedImages],
      deadline: parseDate(req.body.deadline),
      completedAt: req.user.role !== 'customer' ? parseDate(req.body.completedAt) : undefined,
      payment: {
        status: 'pending',
        amount: budget || 0,
        currency: ORDER_PAYMENT_CURRENCY
      }
    });

    await order.save();
    await order.populate('customerId', 'name email phone');

    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Error creating order', error: error.message });
  }
});

app.put('/api/orders/:id', authMiddleware, requireRole('admin', 'employee'), requireObjectId('id'), async (req, res) => {
  try {
    const existingOrder = await Order.findById(req.params.id).populate('customerId', 'name email phone');
    if (!existingOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const updateData = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      dimensions: req.body.dimensions,
      material: req.body.material,
      budget: parseNumber(req.body.budget),
      status: orderStatuses.includes(req.body.status) ? req.body.status : undefined,
      updatedAt: Date.now()
    };

    if (Object.prototype.hasOwnProperty.call(req.body, 'deadline')) {
      const parsedDeadline = parseDate(req.body.deadline);
      updateData.deadline = parsedDeadline || null;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'completedAt')) {
      const parsedCompletedAt = parseDate(req.body.completedAt);
      updateData.completedAt = parsedCompletedAt || null;
    }

    if (updateData.budget !== undefined && existingOrder.payment?.status !== 'paid') {
      const previousPayment = existingOrder.payment?.toObject ? existingOrder.payment.toObject() : (existingOrder.payment || {});
      updateData.payment = {
        ...previousPayment,
        amount: updateData.budget || 0,
        currency: previousPayment.currency || ORDER_PAYMENT_CURRENCY,
        status: previousPayment.status || 'pending'
      };
    }

    Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

    const order = await Order.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('customerId', 'name email phone');

    let emailSent = false;
    let emailError = null;

    if (updateData.status && updateData.status !== existingOrder.status) {
      const statusLabel = formatStatusLabel(updateData.status);
      const customerId = order.customerId?._id || order.customerId;
      await Notification.create({
        userId: customerId,
        orderId: order._id,
        type: 'order_status',
        title: 'Order status updated',
        message: `Your order "${order.title}" is now ${statusLabel}.`,
        statusFrom: existingOrder.status,
        statusTo: updateData.status
      });

      await sendCustomerNotificationChannels({
        customer: order.customerId,
        title: 'Order status updated',
        message: `Your order "${order.title}" is now ${statusLabel}.`,
        sendEmail: false
      });

      if (order.customerId?.email) {
        try {
          await sendOrderStatusEmail({
            to: order.customerId.email,
            name: order.customerId.name,
            orderTitle: order.title,
            status: statusLabel
          });
          emailSent = true;
        } catch (sendError) {
          console.error('Failed to send order status email:', sendError);
          emailError = sendError.message;
        }
      }
    }

    res.json({ message: 'Order updated successfully', order, emailSent, emailError });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ message: 'Error updating order', error: error.message });
  }
});

app.post('/api/orders/:id/cancel-request', authMiddleware, requireObjectId('id'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('customerId', 'name email phone');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can request cancellation' });
    }

    if (order.customerId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (['completed', 'delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ message: 'Order cannot be cancelled in its current status' });
    }

    if (order.cancellationRequest?.status === 'pending') {
      return res.status(400).json({ message: 'Cancellation request already submitted' });
    }

    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';

    order.cancellationRequest = {
      status: 'pending',
      requestedAt: new Date(),
      requestedBy: req.user._id,
      reason: reason || undefined
    };
    order.updatedAt = Date.now();

    if (!order.notes) order.notes = [];
    order.notes.push({
      text: reason ? `Cancellation requested: ${reason}` : 'Cancellation requested by customer',
      addedBy: req.user.name,
      addedAt: new Date()
    });

    await order.save();

    const customerId = order.customerId?._id || order.customerId;
    await Notification.create({
      userId: customerId,
      orderId: order._id,
      type: 'order_update',
      title: 'Cancellation request sent',
      message: 'Your cancellation request has been sent to admin for approval.'
    });

    await sendCustomerNotificationChannels({
      customer: order.customerId,
      title: 'Cancellation request sent',
      message: 'Your cancellation request has been sent to admin for approval.'
    });

    const adminMessageBase = `Customer ${order.customerId?.name || req.user.name} requested cancellation for order "${order.title}".`;
    const adminMessage = reason ? `${adminMessageBase} Reason: ${reason}` : adminMessageBase;
    try {
      await notifyAdmins({
        title: 'Cancellation requested',
        message: adminMessage,
        orderId: order._id
      });
    } catch (notifyError) {
      console.error('Failed to notify admins:', notifyError);
    }

    res.json({ message: 'Cancellation request submitted', order });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({ message: 'Error submitting cancellation request', error: error.message });
  }
});

app.post('/api/orders/:id/cancel-approve', authMiddleware, requireRole('admin', 'employee'), requireObjectId('id'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('customerId', 'name email phone');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.cancellationRequest?.status !== 'pending') {
      return res.status(400).json({ message: 'No pending cancellation request for this order' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ message: 'Order is already cancelled' });
    }

    const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
    const previousStatus = order.status;

    order.status = 'cancelled';
    order.completedAt = null;
    order.updatedAt = Date.now();
    order.cancellationRequest.status = 'approved';
    order.cancellationRequest.resolvedAt = new Date();
    order.cancellationRequest.resolvedBy = req.user._id;
    if (note) {
      order.cancellationRequest.resolutionNote = note;
    }

    if (!order.notes) order.notes = [];
    order.notes.push({
      text: note ? `Cancellation approved: ${note}` : 'Cancellation approved by admin',
      addedBy: req.user.name,
      addedAt: new Date()
    });

    await order.save();

    let emailSent = false;
    let emailError = null;

    const customerId = order.customerId?._id || order.customerId;
    await Notification.create({
      userId: customerId,
      orderId: order._id,
      type: 'order_status',
      title: 'Order Cancelled',
      message: `Your order "${order.title}" has been cancelled.`,
      statusFrom: previousStatus,
      statusTo: 'cancelled'
    });

    await sendCustomerNotificationChannels({
      customer: order.customerId,
      title: 'Order cancelled',
      message: `Your order "${order.title}" has been cancelled.`,
      sendEmail: false
    });

    if (order.customerId?.email) {
      try {
        await sendOrderStatusEmail({
          to: order.customerId.email,
          name: order.customerId.name,
          orderTitle: order.title,
          status: 'Cancelled'
        });
        emailSent = true;
      } catch (sendError) {
        console.error('Failed to send order status email:', sendError);
        emailError = sendError.message;
      }
    }

    res.json({ message: 'Cancellation approved and order cancelled', order, emailSent, emailError });
  } catch (error) {
    console.error('Cancel approval error:', error);
    res.status(500).json({ message: 'Error approving cancellation', error: error.message });
  }
});

app.put('/api/orders/:id/cancel', authMiddleware, requireRole('admin', 'employee'), requireObjectId('id'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('customerId', 'name email phone');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!['pending', 'confirmed', 'in_progress'].includes(order.status)) {
      return res.status(400).json({ message: 'Order cannot be cancelled in its current status' });
    }

    const previousStatus = order.status;
    order.status = 'cancelled';
    order.completedAt = null;
    order.updatedAt = Date.now();
    if (!order.notes) order.notes = [];
    order.notes.push({
      text: 'Order cancelled by staff',
      addedBy: req.user.name,
      addedAt: new Date()
    });

    if (!order.cancellationRequest) {
      order.cancellationRequest = { status: 'approved' };
    }
    if (order.cancellationRequest.status !== 'approved') {
      order.cancellationRequest.status = 'approved';
      order.cancellationRequest.resolvedAt = new Date();
      order.cancellationRequest.resolvedBy = req.user._id;
    }

    await order.save();

    let emailSent = false;
    let emailError = null;

    // Send notification to admin (optional, but good for tracking)
    // For now just notify the user confirming cancellation

    if (previousStatus !== 'cancelled') {
      const statusLabel = 'Cancelled';
      // Notify user
      const customerId = order.customerId?._id || order.customerId;
      await Notification.create({
        userId: customerId,
        orderId: order._id,
        type: 'order_status',
        title: 'Order Cancelled',
        message: `Your order "${order.title}" has been cancelled.`,
        statusFrom: previousStatus,
        statusTo: 'cancelled'
      });

      await sendCustomerNotificationChannels({
        customer: order.customerId,
        title: 'Order cancelled',
        message: `Your order "${order.title}" has been cancelled.`,
        sendEmail: false
      });

      if (order.customerId?.email) {
        try {
          await sendOrderStatusEmail({
            to: order.customerId.email,
            name: order.customerId.name,
            orderTitle: order.title,
            status: statusLabel
          });
          emailSent = true;
        } catch (sendError) {
          console.error('Failed to send order status email:', sendError);
          emailError = sendError.message;
        }
      }
    }

    res.json({ message: 'Order cancelled successfully', order, emailSent, emailError });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Error cancelling order', error: error.message });
  }
});

app.patch('/api/orders/:id/status', authMiddleware, requireRole('admin', 'employee'), requireObjectId('id'), async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!status || !orderStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const order = await Order.findById(req.params.id).populate('customerId', 'name email phone');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const previousStatus = order.status;
    order.status = status;
    order.updatedAt = Date.now();

    if (note) {
      order.notes.push({ text: note, addedBy: req.user.name });
    }

    if (status === 'cancelled' && order.cancellationRequest?.status === 'pending') {
      order.cancellationRequest.status = 'approved';
      order.cancellationRequest.resolvedAt = new Date();
      order.cancellationRequest.resolvedBy = req.user._id;
    }

    await order.save();

    let emailSent = false;
    let emailError = null;

    if (previousStatus !== status) {
      const statusLabel = formatStatusLabel(status);
      const customerId = order.customerId?._id || order.customerId;
      await Notification.create({
        userId: customerId,
        orderId: order._id,
        type: 'order_status',
        title: 'Order status updated',
        message: `Your order "${order.title}" is now ${statusLabel}.`,
        statusFrom: previousStatus,
        statusTo: status
      });

      await sendCustomerNotificationChannels({
        customer: order.customerId,
        title: 'Order status updated',
        message: `Your order "${order.title}" is now ${statusLabel}.`,
        sendEmail: false
      });

      if (order.customerId?.email) {
        try {
          await sendOrderStatusEmail({
            to: order.customerId.email,
            name: order.customerId.name,
            orderTitle: order.title,
            status: statusLabel
          });
          emailSent = true;
        } catch (sendError) {
          console.error('Failed to send order status email:', sendError);
          emailError = sendError.message;
        }
      }
    }

    res.json({ message: 'Order status updated', order, emailSent, emailError });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Error updating status', error: error.message });
  }
});

app.delete('/api/orders/:id', authMiddleware, requireRole('admin', 'employee'), requireObjectId('id'), async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ message: 'Error deleting order', error: error.message });
  }
});

// Payment Routes
app.post('/api/payments/razorpay/order', authMiddleware, async (req, res) => {
  try {
    if (!RAZORPAY_ENABLED || !razorpayClient) {
      return res.status(503).json({ message: 'Razorpay is not configured on the server' });
    }

    const { orderId } = req.body;
    if (!orderId || !isValidObjectId(orderId)) {
      return res.status(400).json({ message: 'A valid orderId is required' });
    }

    const order = await Order.findById(orderId).populate('customerId', 'name email phone');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (req.user.role === 'customer' && order.customerId?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const amountInPaise = toOrderAmountPaise(order.budget || order.payment?.amount || 0);
    if (amountInPaise <= 0) {
      return res.status(400).json({ message: 'Order budget must be greater than zero to accept payment' });
    }

    const receipt = `cs_${String(order._id).slice(-10)}_${Date.now()}`.slice(0, 40);
    const razorpayOrder = await razorpayClient.orders.create({
      amount: amountInPaise,
      currency: ORDER_PAYMENT_CURRENCY,
      receipt,
      notes: {
        appOrderId: String(order._id),
        customerId: String(order.customerId?._id || order.customerId || '')
      }
    });

    const previousPayment = order.payment?.toObject ? order.payment.toObject() : (order.payment || {});
    order.payment = {
      ...previousPayment,
      status: 'pending',
      amount: amountInPaise / 100,
      currency: ORDER_PAYMENT_CURRENCY,
      razorpayOrderId: razorpayOrder.id
    };
    order.updatedAt = Date.now();
    await order.save();

    return res.json({
      message: 'Razorpay order created',
      keyId: RAZORPAY_KEY_ID,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      appOrderId: order._id,
      prefill: {
        name: order.customerId?.name || req.user.name || '',
        email: order.customerId?.email || req.user.email || '',
        contact: order.customerId?.phone || req.user.phone || ''
      }
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    return res.status(500).json({ message: 'Failed to create payment order', error: error.message });
  }
});

app.post('/api/payments/razorpay/verify', authMiddleware, async (req, res) => {
  try {
    if (!RAZORPAY_ENABLED || !RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ message: 'Razorpay is not configured on the server' });
    }

    const {
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    } = req.body;

    if (!orderId || !isValidObjectId(orderId)) {
      return res.status(400).json({ message: 'A valid orderId is required' });
    }

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ message: 'Razorpay payment fields are required' });
    }

    const order = await Order.findById(orderId).populate('customerId', 'name email phone');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (req.user.role === 'customer' && order.customerId?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (order.payment?.razorpayOrderId && order.payment.razorpayOrderId !== razorpayOrderId) {
      return res.status(400).json({ message: 'Razorpay order mismatch' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      const failedPayment = order.payment?.toObject ? order.payment.toObject() : (order.payment || {});
      order.payment = {
        ...failedPayment,
        status: 'failed',
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      };
      order.updatedAt = Date.now();
      await order.save();
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    const previousPayment = order.payment?.toObject ? order.payment.toObject() : (order.payment || {});
    order.payment = {
      ...previousPayment,
      status: 'paid',
      amount: previousPayment.amount || order.budget || 0,
      currency: previousPayment.currency || ORDER_PAYMENT_CURRENCY,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paidAt: new Date()
    };
    if (order.status === 'pending') {
      order.status = 'confirmed';
    }
    order.updatedAt = Date.now();
    if (!order.notes) order.notes = [];
    order.notes.push({
      text: `Payment received via Razorpay (${razorpayPaymentId})`,
      addedBy: req.user.name || 'System',
      addedAt: new Date()
    });
    await order.save();

    const customerId = order.customerId?._id || order.customerId;
    await Notification.create({
      userId: customerId,
      orderId: order._id,
      type: 'order_update',
      title: 'Payment received',
      message: `Payment for order "${order.title}" was received successfully.`
    });

    try {
      await notifyAdmins({
        title: 'Payment received',
        message: `Payment received for order "${order.title}" (${razorpayPaymentId}).`,
        orderId: order._id
      });
    } catch (notifyError) {
      console.error('Failed to notify admins on payment verification:', notifyError);
    }

    return res.json({
      message: 'Payment verified successfully',
      order
    });
  } catch (error) {
    console.error('Verify Razorpay payment error:', error);
    return res.status(500).json({ message: 'Failed to verify payment', error: error.message });
  }
});

// Notification Routes
app.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    const rawLimit = parseInt(req.query.limit || '20', 10);
    const limit = Number.isNaN(rawLimit) ? 20 : Math.min(rawLimit, 100);
    const query = { userId: req.user._id };

    if (req.query.unread === 'true') {
      query.readAt = { $exists: false };
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.patch('/api/notifications/:id/read', authMiddleware, requireObjectId('id'), async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Update notification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Inventory Routes
app.get('/api/inventory', authMiddleware, requireRole('admin', 'employee'), async (req, res) => {
  try {
    const inventory = await Inventory.find().sort({ itemName: 1 });
    res.json(inventory);
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/inventory/low-stock', authMiddleware, requireRole('admin', 'employee'), async (req, res) => {
  try {
    const lowStockItems = await Inventory.find({
      $expr: { $lte: ['$quantity', '$reorderLevel'] }
    });
    res.json(lowStockItems);
  } catch (error) {
    console.error('Get low stock error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/inventory/:id', authMiddleware, requireRole('admin', 'employee'), requireObjectId('id'), async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    res.json(item);
  } catch (error) {
    console.error('Get inventory item error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/inventory', authMiddleware, requireRole('admin', 'employee'), async (req, res) => {
  try {
    const inventory = await Inventory.create({
      itemName: req.body.itemName,
      category: req.body.category,
      quantity: parseNumber(req.body.quantity) || 0,
      unit: req.body.unit,
      price: parseNumber(req.body.price),
      supplier: req.body.supplier,
      supplierContact: req.body.supplierContact,
      reorderLevel: parseNumber(req.body.reorderLevel) || 0,
      location: req.body.location,
      lastUpdated: Date.now()
    });

    res.status(201).json({
      message: 'Inventory item added successfully',
      inventory
    });
  } catch (error) {
    console.error('Add inventory error:', error);
    res.status(500).json({ message: 'Error adding inventory item', error: error.message });
  }
});

app.put('/api/inventory/:id', authMiddleware, requireRole('admin', 'employee'), requireObjectId('id'), async (req, res) => {
  try {
    const updateData = {
      itemName: req.body.itemName,
      category: req.body.category,
      quantity: parseNumber(req.body.quantity),
      unit: req.body.unit,
      price: parseNumber(req.body.price),
      supplier: req.body.supplier,
      supplierContact: req.body.supplierContact,
      reorderLevel: parseNumber(req.body.reorderLevel),
      location: req.body.location,
      lastUpdated: Date.now()
    };

    Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

    const inventory = await Inventory.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    res.json({ message: 'Inventory item updated successfully', inventory });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ message: 'Error updating inventory item', error: error.message });
  }
});

app.patch('/api/inventory/:id/stock', authMiddleware, requireRole('admin', 'employee'), requireObjectId('id'), async (req, res) => {
  try {
    const quantity = parseNumber(req.body.quantity);
    if (quantity === undefined) {
      return res.status(400).json({ message: 'Quantity is required' });
    }

    const inventory = await Inventory.findByIdAndUpdate(
      req.params.id,
      { quantity, lastUpdated: Date.now() },
      { new: true }
    );

    if (!inventory) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    res.json({ message: 'Stock updated successfully', inventory });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ message: 'Error updating stock', error: error.message });
  }
});

app.delete('/api/inventory/:id', authMiddleware, requireRole('admin'), requireObjectId('id'), async (req, res) => {
  try {
    const inventory = await Inventory.findByIdAndDelete(req.params.id);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    res.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Delete inventory error:', error);
    res.status(500).json({ message: 'Error deleting inventory item', error: error.message });
  }
});

// Report Routes
app.get('/api/reports/dashboard', authMiddleware, requireRole('admin', 'employee'), async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const completedOrders = await Order.countDocuments({ status: { $in: ['completed', 'delivered'] } });

    const totalRevenueAgg = await Order.aggregate([
      { $match: { status: { $in: ['completed', 'delivered'] } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$budget', 0] } } } }
    ]);

    const activeCustomers = await Order.distinct('customerId');
    const lowStockItems = await Inventory.countDocuments({
      $expr: { $lte: ['$quantity', '$reorderLevel'] }
    });

    res.json({
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue: totalRevenueAgg[0]?.total || 0,
      activeCustomers: activeCustomers.length,
      lowStockItems
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/reports/sales', authMiddleware, requireRole('admin', 'employee'), async (req, res) => {
  try {
    const rawMonths = parseInt(req.query.months || req.query.period || '6', 10);
    const months = Number.isNaN(rawMonths) ? 6 : rawMonths;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - (months - 1));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const series = await Order.aggregate([
      { $match: { status: { $in: ['completed', 'delivered'] } } },
      { $addFields: { revenueDate: { $ifNull: ['$completedAt', '$updatedAt'] } } },
      { $match: { revenueDate: { $gte: startDate } } },
      {
        $group: {
          _id: { year: { $year: '$revenueDate' }, month: { $month: '$revenueDate' } },
          totalRevenue: { $sum: { $ifNull: ['$budget', 0] } },
          totalOrders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const formattedSeries = series.map((item) => ({
      period: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      totalRevenue: item.totalRevenue,
      totalOrders: item.totalOrders
    }));

    const totals = formattedSeries.reduce(
      (acc, item) => {
        acc.totalRevenue += item.totalRevenue;
        acc.totalOrders += item.totalOrders;
        return acc;
      },
      { totalRevenue: 0, totalOrders: 0 }
    );

    res.json({
      months,
      series: formattedSeries,
      totalRevenue: totals.totalRevenue,
      totalOrders: totals.totalOrders
    });
  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/reports/inventory', authMiddleware, requireRole('admin', 'employee'), async (req, res) => {
  try {
    const totalItems = await Inventory.countDocuments();
    const lowStockItems = await Inventory.find({
      $expr: { $lte: ['$quantity', '$reorderLevel'] }
    });

    const totalValueAgg = await Inventory.aggregate([
      { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', { $ifNull: ['$price', 0] }] } } } }
    ]);

    res.json({
      totalItems,
      lowStockCount: lowStockItems.length,
      totalStockValue: totalValueAgg[0]?.total || 0,
      lowStockItems
    });
  } catch (error) {
    console.error('Inventory report error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/reports/customers', authMiddleware, requireRole('admin', 'employee'), async (req, res) => {
  try {
    const summary = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$customerId',
          orders: { $sum: 1 },
          totalSpent: { $sum: { $ifNull: ['$budget', 0] } },
          lastOrder: { $max: '$createdAt' }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 }
    ]);

    const customerIds = summary.map((item) => item._id);
    const customers = await User.find({ _id: { $in: customerIds } }, 'name email');
    const customerMap = new Map(customers.map((c) => [String(c._id), c]));

    const result = summary.map((item) => ({
      id: item._id,
      name: customerMap.get(String(item._id))?.name || 'Customer',
      orders: item.orders,
      totalSpent: item.totalSpent,
      lastOrder: item.lastOrder
    }));

    res.json(result);
  } catch (error) {
    console.error('Customer report error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Base API route
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to Carpenter Shop API' });
});

// Error Handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'Only image files are allowed') {
    return res.status(400).json({ message: err.message });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Server error', error: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
});
