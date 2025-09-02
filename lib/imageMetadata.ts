// Utility functions for handling image metadata

export interface ImageMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
  lastModified: Date;
  // EXIF data (if available)
  exifData?: {
    make?: string;
    model?: string;
    software?: string;
    dateTime?: string;
    gps?: {
      latitude?: number;
      longitude?: number;
      altitude?: number;
    };
    camera?: {
      aperture?: string;
      shutterSpeed?: string;
      iso?: number;
      focalLength?: string;
    };
  };
}

export async function extractImageMetadata(file: File): Promise<ImageMetadata> {
  const metadata: ImageMetadata = {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    lastModified: new Date(file.lastModified),
  };

  // Note: For full EXIF data extraction, you would need a library like 'exif-js' or 'piexifjs'
  // For now, we'll capture basic file metadata
  // In a production app, you might want to add:
  // - EXIF data extraction
  // - GPS location (with user permission)
  // - Camera settings
  // - Image dimensions
  // - Color profile information

  return metadata;
}

export function formatImageMetadata(metadata: ImageMetadata): string {
  const parts: string[] = [];
  
  parts.push(`File: ${metadata.fileName}`);
  parts.push(`Size: ${Math.round(metadata.fileSize / 1024)}KB`);
  parts.push(`Type: ${metadata.fileType}`);
  parts.push(`Uploaded: ${metadata.lastModified.toLocaleString()}`);
  
  if (metadata.exifData) {
    if (metadata.exifData.make && metadata.exifData.model) {
      parts.push(`Camera: ${metadata.exifData.make} ${metadata.exifData.model}`);
    }
    if (metadata.exifData.software) {
      parts.push(`Software: ${metadata.exifData.software}`);
    }
    if (metadata.exifData.dateTime) {
      parts.push(`Taken: ${metadata.exifData.dateTime}`);
    }
    if (metadata.exifData.gps?.latitude && metadata.exifData.gps?.longitude) {
      parts.push(`Location: ${metadata.exifData.gps.latitude.toFixed(6)}, ${metadata.exifData.gps.longitude.toFixed(6)}`);
    }
  }
  
  return parts.join(' • ');
}

// Common mobile device metadata patterns
export const MOBILE_METADATA_PATTERNS = {
  // Common mobile camera apps and devices
  devices: [
    'iPhone', 'Samsung', 'Google Pixel', 'OnePlus', 'Huawei', 'Xiaomi',
    'LG', 'Motorola', 'Sony', 'Nokia', 'HTC'
  ],
  apps: [
    'Camera', 'Photos', 'Gallery', 'Snapchat', 'Instagram', 'WhatsApp',
    'Telegram', 'Facebook', 'Twitter', 'TikTok'
  ],
  // Common mobile image characteristics
  characteristics: {
    maxSize: 50 * 1024 * 1024, // 50MB typical mobile limit
    commonTypes: ['image/jpeg', 'image/png', 'image/heic', 'image/webp'],
    typicalResolutions: [
      '1920x1080', '1080x1920', '3024x4032', '4032x3024', // iPhone
      '1080x2340', '1440x3200', '1080x2400' // Android
    ]
  }
};
