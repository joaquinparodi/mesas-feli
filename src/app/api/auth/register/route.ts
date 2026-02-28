import { NextRequest } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { authLimiter } from '@/lib/rate-limit';
import User from '@/models/User';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password cannot exceed 128 characters'),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, 'Invalid phone number')
    .optional(),
  role: z.enum(['client', 'organizer']).optional().default('client'),
});

/**
 * POST /api/auth/register
 * Register a new user.
 * - Validates input with Zod
 * - Checks for duplicate email
 * - Creates user (password hashing handled by Mongoose pre-save hook)
 * - Rate limited with authLimiter
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = authLimiter(request);
    if (rateLimitResult) return rateLimitResult;

    await dbConnect();

    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return errorResponse(errors, 400);
    }

    const { name, email, password, phone, role } = validation.data;

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existingUser) {
      return errorResponse('An account with this email already exists', 409);
    }

    // Create user (password hashing is handled by the User model pre-save hook)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      role,
    });

    // Return user without password
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      loyaltyPoints: user.loyaltyPoints,
      createdAt: user.createdAt,
    };

    return successResponse(
      {
        user: userResponse,
        message: 'Account created successfully. You can now log in.',
      },
      201
    );
  } catch (error: any) {
    console.error('POST /api/auth/register error:', error);

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return errorResponse('An account with this email already exists', 409);
    }

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors)
        .map((e: any) => e.message)
        .join(', ');
      return errorResponse(messages, 400);
    }

    return errorResponse(error.message || 'Failed to register user', 500);
  }
}
