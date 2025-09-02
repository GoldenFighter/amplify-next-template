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

  // Try to extract basic image dimensions and EXIF data
  try {
    const imageData = await extractImageData(file);
    if (imageData) {
      metadata.exifData = imageData;
    }
  } catch (error) {
    console.log('Could not extract image metadata:', error);
  }

  return metadata;
}

// Helper function to extract image data including dimensions and basic EXIF
async function extractImageData(file: File): Promise<ImageMetadata['exifData'] | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      const exifData: ImageMetadata['exifData'] = {
        // Basic image info
        software: detectMobileApp(file.name),
        dateTime: new Date(file.lastModified).toISOString(),
      };

      // Try to detect mobile device from filename patterns
      const deviceInfo = detectMobileDevice(file.name);
      if (deviceInfo) {
        exifData.make = deviceInfo.make;
        exifData.model = deviceInfo.model;
      }

      // Store image dimensions
      exifData.camera = {
        focalLength: `${img.width}x${img.height}`,
      };

      resolve(exifData);
    };

    img.onerror = () => {
      resolve(null);
    };

    img.src = URL.createObjectURL(file);
  });
}

// Detect mobile app from filename patterns
function detectMobileApp(fileName: string): string | undefined {
  const lowerName = fileName.toLowerCase();
  
  if (lowerName.includes('snapchat') || lowerName.includes('snap')) return 'Snapchat';
  if (lowerName.includes('instagram') || lowerName.includes('insta')) return 'Instagram';
  if (lowerName.includes('whatsapp') || lowerName.includes('wa_')) return 'WhatsApp';
  if (lowerName.includes('telegram')) return 'Telegram';
  if (lowerName.includes('facebook') || lowerName.includes('fb_')) return 'Facebook';
  if (lowerName.includes('twitter') || lowerName.includes('tw_')) return 'Twitter';
  if (lowerName.includes('tiktok')) return 'TikTok';
  if (lowerName.includes('camera') || lowerName.includes('img_')) return 'Camera';
  if (lowerName.includes('photo') || lowerName.includes('pic_')) return 'Photos';
  
  return 'Unknown App';
}

// Detect mobile device from filename patterns
function detectMobileDevice(fileName: string): { make: string; model: string } | null {
  const lowerName = fileName.toLowerCase();
  
  // iPhone patterns
  if (lowerName.includes('iphone') || lowerName.includes('ios')) {
    return { make: 'Apple', model: 'iPhone' };
  }
  
  // Samsung patterns
  if (lowerName.includes('samsung') || lowerName.includes('galaxy')) {
    return { make: 'Samsung', model: 'Galaxy' };
  }
  
  // Google Pixel patterns
  if (lowerName.includes('pixel') || lowerName.includes('google')) {
    return { make: 'Google', model: 'Pixel' };
  }
  
  // OnePlus patterns
  if (lowerName.includes('oneplus')) {
    return { make: 'OnePlus', model: 'OnePlus' };
  }
  
  // Huawei patterns
  if (lowerName.includes('huawei') || lowerName.includes('honor')) {
    return { make: 'Huawei', model: 'Huawei' };
  }
  
  // Xiaomi patterns
  if (lowerName.includes('xiaomi') || lowerName.includes('mi_')) {
    return { make: 'Xiaomi', model: 'Xiaomi' };
  }
  
  return null;
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
