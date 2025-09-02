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
    dateTimeOriginal?: string;
    dateTimeDigitized?: string;
    gps?: {
      latitude?: number;
      longitude?: number;
      altitude?: number;
      latitudeRef?: string;
      longitudeRef?: string;
    };
    camera?: {
      aperture?: string;
      shutterSpeed?: string;
      iso?: number;
      focalLength?: string;
      flash?: string;
      whiteBalance?: string;
      exposureMode?: string;
      meteringMode?: string;
      sceneCaptureType?: string;
    };
    image?: {
      width?: number;
      height?: number;
      orientation?: number;
      xResolution?: number;
      yResolution?: number;
      resolutionUnit?: string;
      colorSpace?: string;
      compression?: string;
    };
    // Additional validation fields
    isRecent?: boolean; // Within last hour
    isFromCamera?: boolean; // Likely from phone camera
    validationScore?: number; // 0-100 confidence score
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

// Helper function to extract comprehensive image data including EXIF
async function extractImageData(file: File): Promise<ImageMetadata['exifData'] | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      const now = new Date();
      const fileTime = new Date(file.lastModified);
      const timeDiff = now.getTime() - fileTime.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      const exifData: ImageMetadata['exifData'] = {
        // Basic image info
        software: detectMobileApp(file.name),
        dateTime: fileTime.toISOString(),
        dateTimeOriginal: fileTime.toISOString(),
        dateTimeDigitized: fileTime.toISOString(),
        
        // Image dimensions and properties
        image: {
          width: img.width,
          height: img.height,
          orientation: detectOrientation(img.width, img.height),
          xResolution: 72, // Default
          yResolution: 72, // Default
          resolutionUnit: 'inches',
          colorSpace: 'sRGB',
          compression: 'JPEG',
        },
        
        // Camera settings (estimated for mobile)
        camera: {
          focalLength: `${img.width}x${img.height}`,
          flash: 'Auto',
          whiteBalance: 'Auto',
          exposureMode: 'Auto',
          meteringMode: 'Multi-segment',
          sceneCaptureType: 'Standard',
        },
        
        // Validation fields
        isRecent: hoursDiff <= 1, // Within last hour
        isFromCamera: isLikelyFromCamera(file.name, file.size, img.width, img.height),
        validationScore: calculateValidationScore(file, img, hoursDiff),
      };

      // Try to detect mobile device from filename patterns
      const deviceInfo = detectMobileDevice(file.name);
      if (deviceInfo) {
        exifData.make = deviceInfo.make;
        exifData.model = deviceInfo.model;
      }

      // Try to extract GPS data from filename (some apps include location in filename)
      const gpsData = extractGPSFromFilename(file.name);
      if (gpsData) {
        exifData.gps = gpsData;
      }

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

// Detect image orientation based on dimensions
function detectOrientation(width: number, height: number): number {
  if (width > height) return 1; // Landscape
  if (height > width) return 6; // Portrait
  return 1; // Square
}

// Check if image is likely from a phone camera
function isLikelyFromCamera(fileName: string, fileSize: number, width: number, height: number): boolean {
  const lowerName = fileName.toLowerCase();
  
  // Check filename patterns that suggest camera origin
  const cameraPatterns = [
    'img_', 'photo_', 'pic_', 'camera_', 'snap_', 'dsc_', 'picsart_',
    'screenshot', 'screen_shot', 'screenshot_', 'screen shot'
  ];
  
  const hasCameraPattern = cameraPatterns.some(pattern => lowerName.includes(pattern));
  
  // Check for mobile app patterns
  const mobileAppPatterns = [
    'snapchat', 'instagram', 'whatsapp', 'telegram', 'facebook', 'twitter',
    'tiktok', 'camera', 'photos', 'gallery'
  ];
  
  const hasMobileAppPattern = mobileAppPatterns.some(pattern => lowerName.includes(pattern));
  
  // Check file size (mobile photos are typically 1-10MB)
  const reasonableSize = fileSize > 100000 && fileSize < 10000000; // 100KB to 10MB
  
  // Check dimensions (mobile photos have common resolutions)
  const commonMobileResolutions = [
    { w: 1920, h: 1080 }, { w: 1080, h: 1920 }, // HD
    { w: 3024, h: 4032 }, { w: 4032, h: 3024 }, // iPhone 12MP
    { w: 1080, h: 2340 }, { w: 1440, h: 3200 }, // Android common
    { w: 1080, h: 2400 }, { w: 1170, h: 2532 }, // Various Android
  ];
  
  const hasCommonResolution = commonMobileResolutions.some(res => 
    (width === res.w && height === res.h) || (width === res.h && height === res.w)
  );
  
  // Score the likelihood
  let score = 0;
  if (hasCameraPattern) score += 30;
  if (hasMobileAppPattern) score += 25;
  if (reasonableSize) score += 20;
  if (hasCommonResolution) score += 25;
  
  return score >= 50; // 50% confidence threshold
}

// Calculate validation score for image authenticity
function calculateValidationScore(file: File, img: HTMLImageElement, hoursDiff: number): number {
  let score = 0;
  
  // Time-based scoring (recent images get higher scores)
  if (hoursDiff <= 0.5) score += 40; // Within 30 minutes
  else if (hoursDiff <= 1) score += 30; // Within 1 hour
  else if (hoursDiff <= 2) score += 20; // Within 2 hours
  else if (hoursDiff <= 6) score += 10; // Within 6 hours
  else score += 0; // Older than 6 hours
  
  // File size scoring (reasonable mobile photo sizes)
  if (file.size > 500000 && file.size < 8000000) score += 20; // 500KB to 8MB
  else if (file.size > 100000 && file.size < 15000000) score += 15; // 100KB to 15MB
  else score += 5; // Other sizes
  
  // Resolution scoring (common mobile resolutions)
  const commonResolutions = [
    { w: 1920, h: 1080 }, { w: 1080, h: 1920 },
    { w: 3024, h: 4032 }, { w: 4032, h: 3024 },
    { w: 1080, h: 2340 }, { w: 1440, h: 3200 },
    { w: 1080, h: 2400 }, { w: 1170, h: 2532 },
  ];
  
  const hasCommonResolution = commonResolutions.some(res => 
    (img.width === res.w && img.height === res.h) || (img.width === res.h && img.height === res.w)
  );
  
  if (hasCommonResolution) score += 25;
  else if (img.width > 1000 && img.height > 1000) score += 15; // High resolution
  else score += 5; // Lower resolution
  
  // Filename pattern scoring
  const lowerName = file.name.toLowerCase();
  const cameraPatterns = ['img_', 'photo_', 'pic_', 'camera_', 'snap_'];
  const hasCameraPattern = cameraPatterns.some(pattern => lowerName.includes(pattern));
  
  if (hasCameraPattern) score += 15;
  
  return Math.min(100, Math.max(0, score)); // Clamp between 0-100
}

// Extract GPS data from filename (some apps include location in filename)
function extractGPSFromFilename(fileName: string): { latitude: number; longitude: number } | null {
  // Look for GPS coordinates in filename patterns like "lat_40.7128_lng_-74.0060"
  const gpsPattern = /lat_(-?\d+\.?\d*)_lng_(-?\d+\.?\d*)/i;
  const match = fileName.match(gpsPattern);
  
  if (match) {
    const latitude = parseFloat(match[1]);
    const longitude = parseFloat(match[2]);
    
    // Validate coordinates
    if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
      return { latitude, longitude };
    }
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
    if (metadata.exifData.image?.width && metadata.exifData.image?.height) {
      parts.push(`Resolution: ${metadata.exifData.image.width}×${metadata.exifData.image.height}`);
    }
    if (metadata.exifData.gps?.latitude && metadata.exifData.gps?.longitude) {
      parts.push(`Location: ${metadata.exifData.gps.latitude.toFixed(6)}, ${metadata.exifData.gps.longitude.toFixed(6)}`);
    }
    
    // Add validation information
    if (metadata.exifData.isRecent !== undefined) {
      parts.push(`Recent: ${metadata.exifData.isRecent ? 'Yes' : 'No'}`);
    }
    if (metadata.exifData.isFromCamera !== undefined) {
      parts.push(`From Camera: ${metadata.exifData.isFromCamera ? 'Yes' : 'No'}`);
    }
    if (metadata.exifData.validationScore !== undefined) {
      parts.push(`Validation Score: ${metadata.exifData.validationScore}/100`);
    }
  }
  
  return parts.join(' • ');
}

// Validate if image meets contest requirements
export function validateImageForContest(metadata: ImageMetadata): {
  isValid: boolean;
  reasons: string[];
  score: number;
} {
  const reasons: string[] = [];
  let score = 0;
  
  if (!metadata.exifData) {
    reasons.push('No metadata available');
    return { isValid: false, reasons, score: 0 };
  }
  
  // Check if image is recent (within last hour)
  if (!metadata.exifData.isRecent) {
    reasons.push('Image is not recent (must be taken within last hour)');
  } else {
    score += 40;
  }
  
  // Check if image is from camera
  if (!metadata.exifData.isFromCamera) {
    reasons.push('Image does not appear to be from a phone camera');
  } else {
    score += 30;
  }
  
  // Check validation score
  if (metadata.exifData.validationScore !== undefined) {
    if (metadata.exifData.validationScore < 50) {
      reasons.push(`Low validation score: ${metadata.exifData.validationScore}/100`);
    } else {
      score += 30;
    }
  }
  
  // Check file size (reasonable for mobile photos)
  if (metadata.fileSize < 100000 || metadata.fileSize > 20000000) {
    reasons.push('File size is not typical for mobile photos');
  } else {
    score += 10;
  }
  
  // Check image dimensions
  if (metadata.exifData.image?.width && metadata.exifData.image?.height) {
    const { width, height } = metadata.exifData.image;
    if (width < 500 || height < 500) {
      reasons.push('Image resolution is too low');
    } else if (width > 6000 || height > 6000) {
      reasons.push('Image resolution is unusually high');
    } else {
      score += 10;
    }
  }
  
  const isValid = reasons.length === 0 && score >= 70;
  
  return { isValid, reasons, score };
}

// Get detailed validation report
export function getValidationReport(metadata: ImageMetadata): string {
  const validation = validateImageForContest(metadata);
  
  let report = `Validation Report:\n`;
  report += `Score: ${validation.score}/100\n`;
  report += `Status: ${validation.isValid ? '✅ VALID' : '❌ INVALID'}\n\n`;
  
  if (metadata.exifData) {
    report += `Metadata Analysis:\n`;
    report += `• Recent (within 1 hour): ${metadata.exifData.isRecent ? '✅ Yes' : '❌ No'}\n`;
    report += `• From Camera: ${metadata.exifData.isFromCamera ? '✅ Yes' : '❌ No'}\n`;
    report += `• Validation Score: ${metadata.exifData.validationScore || 0}/100\n`;
    report += `• File Size: ${Math.round(metadata.fileSize / 1024)}KB\n`;
    
    if (metadata.exifData.image?.width && metadata.exifData.image?.height) {
      report += `• Resolution: ${metadata.exifData.image.width}×${metadata.exifData.image.height}\n`;
    }
    
    if (metadata.exifData.make && metadata.exifData.model) {
      report += `• Device: ${metadata.exifData.make} ${metadata.exifData.model}\n`;
    }
    
    if (metadata.exifData.software) {
      report += `• Software: ${metadata.exifData.software}\n`;
    }
  }
  
  if (validation.reasons.length > 0) {
    report += `\nIssues Found:\n`;
    validation.reasons.forEach(reason => {
      report += `• ${reason}\n`;
    });
  }
  
  return report;
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
