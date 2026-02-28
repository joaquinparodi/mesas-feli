import { NextRequest } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { generalLimiter } from '@/lib/rate-limit';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

/**
 * POST /api/upload
 * Handle file upload to Cloudinary.
 * Accepts base64 data URI or multipart form data.
 * Returns the uploaded file URL.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = generalLimiter(request);
    if (rateLimitResult) return rateLimitResult;

    const session = await requireAuth();

    const contentType = request.headers.get('content-type') || '';

    let uploadData: string;
    let folder = 'mesavip';

    if (contentType.includes('multipart/form-data')) {
      // Handle form data upload
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const uploadFolder = formData.get('folder') as string | null;

      if (!file) {
        return errorResponse('No file provided', 400);
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return errorResponse(
          `Invalid file type: ${file.type}. Allowed types: ${ALLOWED_TYPES.join(', ')}`,
          400
        );
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return errorResponse('File size exceeds maximum of 10MB', 400);
      }

      if (uploadFolder) {
        folder = `mesavip/${uploadFolder}`;
      }

      // Convert file to base64 data URI
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');
      uploadData = `data:${file.type};base64,${base64}`;
    } else {
      // Handle JSON body with base64 data
      const body = await request.json();

      if (!body.data) {
        return errorResponse('No file data provided. Send base64 data in "data" field or use multipart form data.', 400);
      }

      uploadData = body.data;

      if (body.folder) {
        folder = `mesavip/${body.folder}`;
      }

      // Validate base64 data URI format
      if (!uploadData.startsWith('data:image/')) {
        return errorResponse('Invalid data URI format. Must start with "data:image/"', 400);
      }

      // Rough size check for base64
      const base64Size = (uploadData.length * 3) / 4;
      if (base64Size > MAX_FILE_SIZE) {
        return errorResponse('File size exceeds maximum of 10MB', 400);
      }
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(uploadData, {
      folder,
      resource_type: 'image',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
      context: {
        uploadedBy: session.user.id,
      },
    });

    return successResponse({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    });
  } catch (error: any) {
    console.error('POST /api/upload error:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return errorResponse(error.message || 'Failed to upload file', 500);
  }
}
