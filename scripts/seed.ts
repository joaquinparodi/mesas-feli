/**
 * MesaVIP Database Seed Script
 *
 * Creates initial data for development:
 * - Users (admin, organizer, promoters, clients)
 * - 1 Venue with 3D layout config
 * - 2 Events (one upcoming/active, one past/finished)
 * - Table categories for the active event
 * - 40+ tables across sectors
 * - Promoters with referral tokens
 * - Sample reservations with QR codes
 * - Sample payments
 * - Sample notifications
 *
 * Run with: npx tsx scripts/seed.ts
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Fallback to .env
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mesavip';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';

// ──────────────────────────────────────────────────────────
// Helper: colored console logs
// ──────────────────────────────────────────────────────────
const log = {
  info: (msg: string) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg: string) => console.log(`\x1b[32m[OK]\x1b[0m   ${msg}`),
  warn: (msg: string) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  error: (msg: string) => console.log(`\x1b[31m[ERR]\x1b[0m  ${msg}`),
  step: (msg: string) => console.log(`\n\x1b[35m==> ${msg}\x1b[0m`),
};

// ──────────────────────────────────────────────────────────
// Import models using direct paths (for tsx/ts-node)
// ──────────────────────────────────────────────────────────

// We need to define schemas inline since @/ aliases won't work in scripts run with tsx.
// We'll import the model files directly via relative path.

// Schema definitions (duplicated here to avoid path alias issues)
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['client', 'organizer', 'promoter', 'admin'],
      default: 'client',
    },
    phone: { type: String, trim: true },
    avatar: { type: String, trim: true },
    loyaltyPoints: { type: Number, default: 0 },
  },
  { timestamps: true }
);
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

const VenueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true },
    layout3DModel: { type: mongoose.Schema.Types.Mixed, default: {} },
    images: { type: [String], default: [] },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
    date: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['draft', 'active', 'sold_out', 'finished'],
      default: 'draft',
    },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    layout3DConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
    coverImage: { type: String, trim: true },
    tags: { type: [String], default: [] },
    ticketPrice: { type: Number },
  },
  { timestamps: true }
);

const TableCategorySchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    capacity: { type: Number, required: true },
    color: { type: String, required: true, trim: true },
    benefits: { type: [String], default: [] },
    position3D: {
      type: { x: Number, y: Number, z: Number },
      default: { x: 0, y: 0, z: 0 },
    },
    icon: { type: String, trim: true },
  },
  { timestamps: true }
);

const TableSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'TableCategory', required: true },
    number: { type: Number, required: true },
    label: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['available', 'reserved', 'sold', 'blocked'],
      default: 'available',
    },
    position3D: {
      type: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        z: { type: Number, default: 0 },
        rotation: { type: Number, default: 0 },
      },
      default: { x: 0, y: 0, z: 0, rotation: 0 },
    },
    sectorLabel: { type: String, required: true, trim: true },
    reservedUntil: { type: Date, default: null },
    reservedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

const PromoterSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    commissionRate: { type: Number, required: true },
    totalSales: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    assignedTables: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Table' }], default: [] },
    referralToken: { type: String, required: true, unique: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ReservationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
    promoterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'used'],
      default: 'pending',
    },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    paymentMethod: { type: String, trim: true },
    amount: { type: Number, required: true },
    qrCode: { type: String, required: true, unique: true },
    qrUsed: { type: Boolean, default: false },
    benefits: { type: [String], default: [] },
    guestCount: { type: Number, required: true },
    guestNames: { type: [String], default: [] },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

const PaymentSchema = new mongoose.Schema(
  {
    reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', required: true },
    provider: {
      type: String,
      enum: ['mercadopago', 'cash'],
      required: true,
    },
    externalId: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'refunded'],
      default: 'pending',
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'ARS' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'reservation_confirmed',
        'payment_received',
        'table_assigned',
        'event_reminder',
        'commission_earned',
        'system',
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false },
    link: { type: String, trim: true },
  },
  { timestamps: true }
);

// ──────────────────────────────────────────────────────────
// Create/get models
// ──────────────────────────────────────────────────────────
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Venue = mongoose.models.Venue || mongoose.model('Venue', VenueSchema);
const Event = mongoose.models.Event || mongoose.model('Event', EventSchema);
const TableCategory = mongoose.models.TableCategory || mongoose.model('TableCategory', TableCategorySchema);
const Table = mongoose.models.Table || mongoose.model('Table', TableSchema);
const Promoter = mongoose.models.Promoter || mongoose.model('Promoter', PromoterSchema);
const Reservation = mongoose.models.Reservation || mongoose.model('Reservation', ReservationSchema);
const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

// ──────────────────────────────────────────────────────────
// QR Token generator
// ──────────────────────────────────────────────────────────
function generateQRToken(params: {
  reservationId: string;
  eventId: string;
  userId: string;
  tableId: string;
}): string {
  return jwt.sign(
    {
      qrId: uuidv4(),
      ...params,
    },
    JWT_SECRET,
    { expiresIn: '30d', issuer: 'mesavip', subject: params.reservationId }
  );
}

// ──────────────────────────────────────────────────────────
// MAIN SEED FUNCTION
// ──────────────────────────────────────────────────────────
async function seed() {
  console.log('\n==========================================');
  console.log('  MesaVIP - Database Seed Script');
  console.log('==========================================\n');

  log.info(`Connecting to MongoDB: ${MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@')}`);

  try {
    await mongoose.connect(MONGODB_URI);
    log.success('Connected to MongoDB');
  } catch (err) {
    log.error(`Failed to connect to MongoDB: ${err}`);
    process.exit(1);
  }

  // ──────────────────────────────────────────────────────
  // Clear all collections
  // ──────────────────────────────────────────────────────
  log.step('Clearing existing data...');

  const collections = [
    'users',
    'venues',
    'events',
    'tablecategories',
    'tables',
    'promoters',
    'reservations',
    'payments',
    'notifications',
  ];

  for (const col of collections) {
    try {
      await mongoose.connection.db!.collection(col).deleteMany({});
      log.success(`Cleared: ${col}`);
    } catch {
      log.warn(`Collection ${col} does not exist yet, skipping`);
    }
  }

  // ──────────────────────────────────────────────────────
  // Create Users
  // ──────────────────────────────────────────────────────
  log.step('Creating users...');

  const salt = await bcrypt.genSalt(12);

  const usersData = [
    {
      name: 'Admin MesaVIP',
      email: 'admin@mesavip.com',
      password: await bcrypt.hash('admin123', salt),
      role: 'admin',
      phone: '+54 11 1234-5678',
      loyaltyPoints: 0,
    },
    {
      name: 'Carlos Organizador',
      email: 'organizador@mesavip.com',
      password: await bcrypt.hash('org123', salt),
      role: 'organizer',
      phone: '+54 11 2345-6789',
      loyaltyPoints: 0,
    },
    {
      name: 'Lucia Promotora',
      email: 'promotor1@mesavip.com',
      password: await bcrypt.hash('promo123', salt),
      role: 'promoter',
      phone: '+54 11 3456-7890',
      loyaltyPoints: 0,
    },
    {
      name: 'Martin Promotor',
      email: 'promotor2@mesavip.com',
      password: await bcrypt.hash('promo123', salt),
      role: 'promoter',
      phone: '+54 11 4567-8901',
      loyaltyPoints: 0,
    },
    {
      name: 'Valentina Promotora',
      email: 'promotor3@mesavip.com',
      password: await bcrypt.hash('promo123', salt),
      role: 'promoter',
      phone: '+54 11 5678-9012',
      loyaltyPoints: 0,
    },
    {
      name: 'Ana Garcia',
      email: 'cliente1@mesavip.com',
      password: await bcrypt.hash('client123', salt),
      role: 'client',
      phone: '+54 11 6789-0123',
      loyaltyPoints: 150,
    },
    {
      name: 'Pedro Lopez',
      email: 'cliente2@mesavip.com',
      password: await bcrypt.hash('client123', salt),
      role: 'client',
      phone: '+54 11 7890-1234',
      loyaltyPoints: 80,
    },
    {
      name: 'Sofia Martinez',
      email: 'cliente3@mesavip.com',
      password: await bcrypt.hash('client123', salt),
      role: 'client',
      phone: '+54 11 8901-2345',
      loyaltyPoints: 200,
    },
    {
      name: 'Diego Fernandez',
      email: 'cliente4@mesavip.com',
      password: await bcrypt.hash('client123', salt),
      role: 'client',
      phone: '+54 11 9012-3456',
      loyaltyPoints: 50,
    },
    {
      name: 'Camila Ruiz',
      email: 'cliente5@mesavip.com',
      password: await bcrypt.hash('client123', salt),
      role: 'client',
      phone: '+54 11 0123-4567',
      loyaltyPoints: 320,
    },
  ];

  const users = await User.insertMany(usersData);
  log.success(`Created ${users.length} users`);

  const admin = users[0];
  const organizer = users[1];
  const promoter1 = users[2];
  const promoter2 = users[3];
  const promoter3 = users[4];
  const clients = users.slice(5);

  // ──────────────────────────────────────────────────────
  // Create Venue
  // ──────────────────────────────────────────────────────
  log.step('Creating venue...');

  const venue = await Venue.create({
    name: 'Club Nocturno Elite',
    address: 'Av. Corrientes 1234, CABA, Buenos Aires',
    capacity: 500,
    organizerId: organizer._id,
    images: [],
    layout3DModel: {
      floorDimensions: { width: 40, depth: 30, height: 0.2 },
      floorTexture: 'dark-marble',
      wallColor: '#1a1a2e',
      ceilingHeight: 6,
      stage: {
        position: { x: 0, y: 0.5, z: -12 },
        dimensions: { width: 12, depth: 6, height: 1 },
        color: '#2d1b4e',
      },
      danceFloor: {
        position: { x: 0, y: 0.05, z: -4 },
        dimensions: { width: 14, depth: 10 },
        color: '#1a0a2e',
        animated: true,
      },
      bars: [
        {
          position: { x: -16, y: 0.5, z: 0 },
          dimensions: { width: 2, depth: 10, height: 1.2 },
          label: 'Bar Principal',
          color: '#3b1d6e',
        },
        {
          position: { x: 16, y: 0.5, z: 5 },
          dimensions: { width: 2, depth: 6, height: 1.2 },
          label: 'Bar Terraza',
          color: '#3b1d6e',
        },
      ],
      sectors: [
        {
          name: 'VIP Platinum',
          color: '#FFD700',
          bounds: { minX: -8, maxX: 8, minZ: -10, maxZ: -6 },
        },
        {
          name: 'VIP Gold',
          color: '#9333EA',
          bounds: { minX: -12, maxX: 12, minZ: -5, maxZ: 2 },
        },
        {
          name: 'Pista',
          color: '#3B82F6',
          bounds: { minX: -14, maxX: 14, minZ: 3, maxZ: 10 },
        },
        {
          name: 'Terraza',
          color: '#22C55E',
          bounds: { minX: 10, maxX: 18, minZ: -2, maxZ: 12 },
        },
      ],
      ambientLight: 0.15,
      spotLights: [
        { position: { x: 0, y: 5, z: -12 }, color: '#a855f7', intensity: 2 },
        { position: { x: -5, y: 5, z: -12 }, color: '#ec4899', intensity: 1.5 },
        { position: { x: 5, y: 5, z: -12 }, color: '#3b82f6', intensity: 1.5 },
        { position: { x: 0, y: 4, z: 0 }, color: '#8b5cf6', intensity: 0.8 },
      ],
      decorations: [
        { type: 'speaker', position: { x: -8, y: 1, z: -11 }, scale: 1 },
        { type: 'speaker', position: { x: 8, y: 1, z: -11 }, scale: 1 },
        { type: 'laser', position: { x: 0, y: 5.5, z: -12 }, scale: 1, rotation: 0 },
      ],
      cameraPosition: { x: 0, y: 15, z: 20 },
      cameraTarget: { x: 0, y: 0, z: 0 },
    },
  });
  log.success(`Created venue: ${venue.name}`);

  // ──────────────────────────────────────────────────────
  // Create Events
  // ──────────────────────────────────────────────────────
  log.step('Creating events...');

  // Upcoming event (next Saturday)
  const nextSaturday = new Date();
  nextSaturday.setDate(nextSaturday.getDate() + ((6 - nextSaturday.getDay() + 7) % 7 || 7));
  nextSaturday.setHours(23, 0, 0, 0);

  const nextSundayEnd = new Date(nextSaturday);
  nextSundayEnd.setDate(nextSundayEnd.getDate() + 1);
  nextSundayEnd.setHours(5, 0, 0, 0);

  const upcomingEvent = await Event.create({
    title: 'Noche Electrica',
    description:
      'La fiesta electronica mas esperada del ano. DJs internacionales, visuales laser de ultima generacion, y la mejor energia. No te la pierdas! Open bar de 23 a 00hs para mesas VIP Platinum.',
    venue: venue._id,
    date: nextSaturday,
    endDate: nextSundayEnd,
    status: 'active',
    organizerId: organizer._id,
    coverImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
    tags: ['electronica', 'DJ', 'laser show', 'VIP', 'open bar'],
    ticketPrice: 50000,
    layout3DConfig: venue.layout3DModel,
  });
  log.success(`Created event: ${upcomingEvent.title} (${upcomingEvent.status})`);

  // Past event
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 14);
  pastDate.setHours(23, 0, 0, 0);

  const pastEndDate = new Date(pastDate);
  pastEndDate.setDate(pastEndDate.getDate() + 1);
  pastEndDate.setHours(5, 0, 0, 0);

  const pastEvent = await Event.create({
    title: 'Retro Vibes',
    description:
      'Una noche dedicada a los clasicos del dance de los 80s y 90s. Musica retro, decoracion vintage y la mejor onda.',
    venue: venue._id,
    date: pastDate,
    endDate: pastEndDate,
    status: 'finished',
    organizerId: organizer._id,
    coverImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80',
    tags: ['retro', '80s', '90s', 'dance', 'clasicos'],
    ticketPrice: 35000,
    layout3DConfig: venue.layout3DModel,
  });
  log.success(`Created event: ${pastEvent.title} (${pastEvent.status})`);

  // ──────────────────────────────────────────────────────
  // Create Table Categories (for upcoming event)
  // ──────────────────────────────────────────────────────
  log.step('Creating table categories...');

  const catPlatinum = await TableCategory.create({
    eventId: upcomingEvent._id,
    name: 'VIP Platinum',
    price: 150000,
    capacity: 8,
    color: '#FFD700',
    benefits: ['Champagne', 'Mesero exclusivo', 'Acceso backstage'],
    position3D: { x: 0, y: 0, z: -8 },
    icon: 'crown',
  });

  const catGold = await TableCategory.create({
    eventId: upcomingEvent._id,
    name: 'VIP Gold',
    price: 100000,
    capacity: 6,
    color: '#9333EA',
    benefits: ['Botella premium', 'Mesero exclusivo'],
    position3D: { x: 0, y: 0, z: -2 },
    icon: 'star',
  });

  const catStandard = await TableCategory.create({
    eventId: upcomingEvent._id,
    name: 'Standard',
    price: 50000,
    capacity: 4,
    color: '#3B82F6',
    benefits: ['Ubicacion central'],
    position3D: { x: 0, y: 0, z: 6 },
    icon: 'table',
  });

  const catTerraza = await TableCategory.create({
    eventId: upcomingEvent._id,
    name: 'Terraza',
    price: 60000,
    capacity: 4,
    color: '#22C55E',
    benefits: ['Vista panoramica', 'Aire libre'],
    position3D: { x: 14, y: 0, z: 5 },
    icon: 'tree',
  });

  log.success('Created 4 table categories');

  // ──────────────────────────────────────────────────────
  // Create Tables (40+ tables)
  // ──────────────────────────────────────────────────────
  log.step('Creating tables...');

  const tablesData: any[] = [];

  // VIP Platinum: tables 1-8 in "VIP Platinum" sector
  for (let i = 1; i <= 8; i++) {
    const angle = ((i - 1) / 8) * Math.PI * 2;
    const radius = 5;
    tablesData.push({
      eventId: upcomingEvent._id,
      categoryId: catPlatinum._id,
      number: i,
      label: `Platinum ${i}`,
      status: i <= 3 ? 'sold' : i === 4 ? 'reserved' : 'available',
      position3D: {
        x: Math.round(Math.cos(angle) * radius * 10) / 10,
        y: 0,
        z: Math.round(Math.sin(angle) * radius * 10) / 10 - 8,
        rotation: Math.round(angle * (180 / Math.PI)),
      },
      sectorLabel: 'VIP Platinum',
      reservedBy: i <= 3 ? clients[i - 1]._id : null,
    });
  }

  // VIP Gold: tables 9-20 in "VIP Gold" sector
  for (let i = 9; i <= 20; i++) {
    const col = (i - 9) % 4;
    const row = Math.floor((i - 9) / 4);
    tablesData.push({
      eventId: upcomingEvent._id,
      categoryId: catGold._id,
      number: i,
      label: `Gold ${i}`,
      status: i <= 12 ? 'sold' : i <= 14 ? 'reserved' : 'available',
      position3D: {
        x: -6 + col * 4,
        y: 0,
        z: -4 + row * 3,
        rotation: 0,
      },
      sectorLabel: 'VIP Gold',
      reservedBy: i <= 12 ? clients[(i - 9) % 5]._id : null,
    });
  }

  // Standard: tables 21-35 in "Pista" sector
  for (let i = 21; i <= 35; i++) {
    const col = (i - 21) % 5;
    const row = Math.floor((i - 21) / 5);
    tablesData.push({
      eventId: upcomingEvent._id,
      categoryId: catStandard._id,
      number: i,
      label: `Pista ${i}`,
      status: i <= 25 ? 'sold' : i <= 27 ? 'reserved' : 'available',
      position3D: {
        x: -10 + col * 5,
        y: 0,
        z: 4 + row * 3,
        rotation: 180,
      },
      sectorLabel: 'Pista',
      reservedBy: i <= 25 ? clients[(i - 21) % 5]._id : null,
    });
  }

  // Terraza: tables 36-45 in "Terraza" sector
  for (let i = 36; i <= 45; i++) {
    const col = (i - 36) % 2;
    const row = Math.floor((i - 36) / 2);
    tablesData.push({
      eventId: upcomingEvent._id,
      categoryId: catTerraza._id,
      number: i,
      label: `Terraza ${i}`,
      status: i <= 38 ? 'sold' : i === 39 ? 'reserved' : 'available',
      position3D: {
        x: 12 + col * 3,
        y: 0,
        z: -1 + row * 3,
        rotation: 90,
      },
      sectorLabel: 'Terraza',
      reservedBy: i <= 38 ? clients[(i - 36) % 5]._id : null,
    });
  }

  const tables = await Table.insertMany(tablesData);
  log.success(`Created ${tables.length} tables`);

  // ──────────────────────────────────────────────────────
  // Create Promoters
  // ──────────────────────────────────────────────────────
  log.step('Creating promoters...');

  const promoter1Tables = tables.filter((t) => [9, 10, 11, 12, 21, 22, 23].includes(t.number));
  const promoter2Tables = tables.filter((t) => [13, 14, 15, 16, 24, 25, 36, 37].includes(t.number));
  const promoter3Tables = tables.filter((t) => [17, 18, 19, 20, 26, 27, 38, 39].includes(t.number));

  const promo1 = await Promoter.create({
    userId: promoter1._id,
    eventId: upcomingEvent._id,
    organizerId: organizer._id,
    commissionRate: 10,
    totalSales: 5,
    totalEarnings: 50000,
    assignedTables: promoter1Tables.map((t) => t._id),
    referralToken: `promo_${uuidv4().replace(/-/g, '').substring(0, 12)}`,
    isActive: true,
  });

  const promo2 = await Promoter.create({
    userId: promoter2._id,
    eventId: upcomingEvent._id,
    organizerId: organizer._id,
    commissionRate: 12,
    totalSales: 4,
    totalEarnings: 48000,
    assignedTables: promoter2Tables.map((t) => t._id),
    referralToken: `promo_${uuidv4().replace(/-/g, '').substring(0, 12)}`,
    isActive: true,
  });

  const promo3 = await Promoter.create({
    userId: promoter3._id,
    eventId: upcomingEvent._id,
    organizerId: organizer._id,
    commissionRate: 15,
    totalSales: 3,
    totalEarnings: 45000,
    assignedTables: promoter3Tables.map((t) => t._id),
    referralToken: `promo_${uuidv4().replace(/-/g, '').substring(0, 12)}`,
    isActive: true,
  });

  log.success(`Created 3 promoters`);
  log.info(`  - ${promoter1.name}: ${promo1.referralToken} (10%)`);
  log.info(`  - ${promoter2.name}: ${promo2.referralToken} (12%)`);
  log.info(`  - ${promoter3.name}: ${promo3.referralToken} (15%)`);

  // ──────────────────────────────────────────────────────
  // Create Reservations (15 sample reservations)
  // ──────────────────────────────────────────────────────
  log.step('Creating reservations...');

  const soldTables = tables.filter((t) => t.status === 'sold');
  const reservedTables = tables.filter((t) => t.status === 'reserved');

  interface ReservationInput {
    userId: mongoose.Types.ObjectId;
    eventId: mongoose.Types.ObjectId;
    tableId: mongoose.Types.ObjectId;
    promoterId: mongoose.Types.ObjectId | null;
    status: string;
    amount: number;
    guestCount: number;
    guestNames: string[];
    benefits: string[];
    notes: string;
    qrCode: string;
    qrUsed: boolean;
    paymentMethod: string;
  }

  const reservationsData: ReservationInput[] = [];

  // Sold tables -> confirmed or used reservations
  for (let i = 0; i < soldTables.length && i < 12; i++) {
    const table = soldTables[i];
    const client = clients[i % clients.length];
    const isUsed = i < 3; // first 3 are "used" (already entered)
    const category = [catPlatinum, catGold, catStandard, catTerraza].find(
      (c) => c._id.toString() === table.categoryId.toString()
    );

    // Determine promoter
    let promoterUserId: mongoose.Types.ObjectId | null = null;
    if (promoter1Tables.find((t) => t._id.toString() === table._id.toString())) {
      promoterUserId = promoter1._id;
    } else if (promoter2Tables.find((t) => t._id.toString() === table._id.toString())) {
      promoterUserId = promoter2._id;
    } else if (promoter3Tables.find((t) => t._id.toString() === table._id.toString())) {
      promoterUserId = promoter3._id;
    }

    const qrToken = generateQRToken({
      reservationId: new mongoose.Types.ObjectId().toString(),
      eventId: upcomingEvent._id.toString(),
      userId: client._id.toString(),
      tableId: table._id.toString(),
    });

    reservationsData.push({
      userId: client._id,
      eventId: upcomingEvent._id,
      tableId: table._id,
      promoterId: promoterUserId,
      status: isUsed ? 'used' : 'confirmed',
      amount: category?.price || 50000,
      guestCount: Math.min(category?.capacity || 4, 2 + Math.floor(Math.random() * 4)),
      guestNames: [`Invitado ${i + 1}A`, `Invitado ${i + 1}B`],
      benefits: category?.benefits || [],
      notes: i % 3 === 0 ? 'Mesa para cumpleanos' : '',
      qrCode: qrToken,
      qrUsed: isUsed,
      paymentMethod: i % 2 === 0 ? 'mercadopago' : 'cash',
    });
  }

  // Reserved tables -> pending reservations
  for (let i = 0; i < reservedTables.length && i < 3; i++) {
    const table = reservedTables[i];
    const client = clients[(i + 2) % clients.length];
    const category = [catPlatinum, catGold, catStandard, catTerraza].find(
      (c) => c._id.toString() === table.categoryId.toString()
    );

    const qrToken = generateQRToken({
      reservationId: new mongoose.Types.ObjectId().toString(),
      eventId: upcomingEvent._id.toString(),
      userId: client._id.toString(),
      tableId: table._id.toString(),
    });

    reservationsData.push({
      userId: client._id,
      eventId: upcomingEvent._id,
      tableId: table._id,
      promoterId: null,
      status: 'pending',
      amount: category?.price || 50000,
      guestCount: 3,
      guestNames: [`Invitado P${i + 1}`],
      benefits: category?.benefits || [],
      notes: '',
      qrCode: qrToken,
      qrUsed: false,
      paymentMethod: 'mercadopago',
    });
  }

  const reservations = await Reservation.insertMany(reservationsData);
  log.success(`Created ${reservations.length} reservations`);

  // ──────────────────────────────────────────────────────
  // Create Payments
  // ──────────────────────────────────────────────────────
  log.step('Creating payments...');

  const paymentsData: any[] = [];

  for (const reservation of reservations) {
    if (reservation.status === 'confirmed' || reservation.status === 'used') {
      paymentsData.push({
        reservationId: reservation._id,
        provider: reservation.paymentMethod === 'cash' ? 'cash' : 'mercadopago',
        externalId:
          reservation.paymentMethod === 'cash' ? undefined : `MP-${uuidv4().substring(0, 8)}`,
        status: 'approved',
        amount: reservation.amount,
        currency: 'ARS',
        metadata: {
          eventTitle: upcomingEvent.title,
          tableNumber: tables.find((t) => t._id.toString() === reservation.tableId.toString())?.number,
        },
        paidAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      });
    } else if (reservation.status === 'pending') {
      paymentsData.push({
        reservationId: reservation._id,
        provider: 'mercadopago',
        externalId: `MP-${uuidv4().substring(0, 8)}`,
        status: 'pending',
        amount: reservation.amount,
        currency: 'ARS',
        metadata: {},
      });
    }
  }

  const payments = await Payment.insertMany(paymentsData);
  log.success(`Created ${payments.length} payments`);

  // Update reservations with payment IDs
  for (let i = 0; i < reservations.length; i++) {
    const matchingPayment = payments.find(
      (p) => p.reservationId.toString() === reservations[i]._id.toString()
    );
    if (matchingPayment) {
      await Reservation.updateOne(
        { _id: reservations[i]._id },
        { $set: { paymentId: matchingPayment._id } }
      );
    }
  }
  log.success('Linked payments to reservations');

  // ──────────────────────────────────────────────────────
  // Create Notifications
  // ──────────────────────────────────────────────────────
  log.step('Creating notifications...');

  const notificationsData: any[] = [
    // For organizer
    {
      userId: organizer._id,
      type: 'payment_received',
      title: 'Nuevo Pago Recibido',
      message: `Se recibio un pago de $150,000 por Mesa Platinum 1 para ${upcomingEvent.title}`,
      read: false,
      link: `/dashboard/events/${upcomingEvent._id}/sales`,
    },
    {
      userId: organizer._id,
      type: 'reservation_confirmed',
      title: 'Reserva Confirmada',
      message: `Ana Garcia confirmo la reserva de Mesa Gold 9 para ${upcomingEvent.title}`,
      read: true,
      link: `/dashboard/events/${upcomingEvent._id}/reservations`,
    },
    {
      userId: organizer._id,
      type: 'system',
      title: 'Evento Proximo',
      message: `Tu evento "${upcomingEvent.title}" esta programado para este sabado. Verifica que todo este listo.`,
      read: false,
      link: `/dashboard/events/${upcomingEvent._id}`,
    },
    // For promoters
    {
      userId: promoter1._id,
      type: 'commission_earned',
      title: 'Comision Ganada',
      message: `Ganaste $15,000 de comision por la venta de Mesa Gold 9. Total acumulado: $50,000`,
      read: false,
      link: '/promoter',
    },
    {
      userId: promoter1._id,
      type: 'table_assigned',
      title: 'Mesas Asignadas',
      message: `Se te asignaron 7 mesas para el evento "${upcomingEvent.title}". Comparti tu link para vender!`,
      read: true,
      link: '/promoter/tables',
    },
    {
      userId: promoter2._id,
      type: 'commission_earned',
      title: 'Comision Ganada',
      message: 'Ganaste $12,000 de comision por la venta de Mesa Standard 24.',
      read: false,
      link: '/promoter',
    },
    // For clients
    {
      userId: clients[0]._id,
      type: 'reservation_confirmed',
      title: 'Reserva Confirmada!',
      message: `Tu reserva para Mesa Platinum 1 en "${upcomingEvent.title}" fue confirmada. Revisa tu QR.`,
      read: false,
      link: '/profile?tab=reservas',
    },
    {
      userId: clients[0]._id,
      type: 'event_reminder',
      title: 'Recordatorio de Evento',
      message: `Tu evento "${upcomingEvent.title}" es este sabado! No olvides tu QR de entrada.`,
      read: false,
      link: `/events/${upcomingEvent._id}`,
    },
    {
      userId: clients[1]._id,
      type: 'reservation_confirmed',
      title: 'Reserva Confirmada!',
      message: `Tu reserva para Mesa Platinum 2 en "${upcomingEvent.title}" fue confirmada.`,
      read: true,
      link: '/profile?tab=reservas',
    },
    {
      userId: clients[2]._id,
      type: 'reservation_confirmed',
      title: 'Reserva Confirmada!',
      message: `Tu reserva para Mesa Gold 11 en "${upcomingEvent.title}" fue confirmada.`,
      read: false,
      link: '/profile?tab=reservas',
    },
  ];

  await Notification.insertMany(notificationsData);
  log.success(`Created ${notificationsData.length} notifications`);

  // ──────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────
  console.log('\n==========================================');
  console.log('  Seed Complete!');
  console.log('==========================================\n');

  const summary = {
    Users: users.length,
    Venues: 1,
    Events: 2,
    'Table Categories': 4,
    Tables: tables.length,
    Promoters: 3,
    Reservations: reservations.length,
    Payments: payments.length,
    Notifications: notificationsData.length,
  };

  for (const [key, val] of Object.entries(summary)) {
    console.log(`  ${key.padEnd(20)} ${val}`);
  }

  console.log('\n  Login credentials:');
  console.log('  ──────────────────────────────────────');
  console.log('  Admin:      admin@mesavip.com / admin123');
  console.log('  Organizer:  organizador@mesavip.com / org123');
  console.log('  Promoter 1: promotor1@mesavip.com / promo123');
  console.log('  Promoter 2: promotor2@mesavip.com / promo123');
  console.log('  Promoter 3: promotor3@mesavip.com / promo123');
  console.log('  Client 1-5: cliente[1-5]@mesavip.com / client123');
  console.log('');
  console.log(`  Promoter 1 referral: ${promo1.referralToken}`);
  console.log(`  Promoter 2 referral: ${promo2.referralToken}`);
  console.log(`  Promoter 3 referral: ${promo3.referralToken}`);
  console.log('');

  await mongoose.disconnect();
  log.success('Disconnected from MongoDB');
  process.exit(0);
}

// ──────────────────────────────────────────────────────────
// Run
// ──────────────────────────────────────────────────────────
seed().catch((err) => {
  log.error(`Seed failed: ${err}`);
  mongoose.disconnect();
  process.exit(1);
});
