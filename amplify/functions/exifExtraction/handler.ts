import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { S3Event, S3EventRecord } from 'aws-lambda';
import * as ExifReader from 'exif-reader';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

export const handler = async (event: S3Event) => {
  console.log('EXIF Extraction Lambda triggered');
  console.log('Event:', JSON.stringify(event, null, 2));

  const results = [];

  for (const record of event.Records) {
    try {
      const result = await processImage(record);
      results.push(result);
    } catch (error) {
      console.error(`Error processing record ${record.s3.object.key}:`, error);
      results.push({
        key: record.s3.object.key,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'EXIF extraction completed',
      results,
    }),
  };
};

async function processImage(record: S3EventRecord) {
  const bucketName = record.s3.bucket.name;
  const objectKey = record.s3.object.key;

  console.log(`Processing image: ${objectKey}`);

  // Download the image from S3
  const getObjectCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
  });

  const response = await s3Client.send(getObjectCommand);
  const imageData = await response.Body?.transformToByteArray();

  if (!imageData) {
    throw new Error('No image data received from S3');
  }

  // Extract EXIF data using a simple approach
  // Note: For production, you might want to use a library like exif-reader
  const exifData = await extractEXIFData(imageData);

  console.log(`EXIF data extracted for ${objectKey}:`, exifData);

  return {
    key: objectKey,
    success: true,
    exifData,
    timestamp: new Date().toISOString(),
  };
}

async function extractEXIFData(imageData: Uint8Array): Promise<any> {
  const buffer = Buffer.from(imageData);
  
  const exifData: any = {
    fileSize: buffer.length,
    extractedAt: new Date().toISOString(),
    hasExif: false,
  };

  try {
    // Use exif-reader library for comprehensive EXIF extraction
    const tags = (ExifReader as any)(buffer);
    
    if (tags && Object.keys(tags).length > 0) {
      exifData.hasExif = true;
      
      // Extract EXIF data with simplified approach
      exifData.exif = {
        // Basic image info
        imageWidth: (tags as any).Image?.width || (tags as any)['Image Width'],
        imageHeight: (tags as any).Image?.height || (tags as any)['Image Height'],
        
        // Camera information
        make: (tags as any).Image?.make || (tags as any)['Make'],
        model: (tags as any).Image?.model || (tags as any)['Model'],
        software: (tags as any).Image?.software || (tags as any)['Software'],
        
        // Date and time
        dateTime: (tags as any).Image?.datetime || (tags as any)['DateTime'],
        dateTimeOriginal: (tags as any).Exif?.datetimeoriginal || (tags as any)['DateTimeOriginal'],
        dateTimeDigitized: (tags as any).Exif?.datetimedigitized || (tags as any)['DateTimeDigitized'],
        
        // Camera settings
        fNumber: (tags as any).Exif?.fnumber || (tags as any)['FNumber'],
        exposureTime: (tags as any).Exif?.exposuretime || (tags as any)['ExposureTime'],
        iso: (tags as any).Exif?.iso || (tags as any)['ISO'],
        focalLength: (tags as any).Exif?.focallength || (tags as any)['FocalLength'],
        flash: (tags as any).Exif?.flash || (tags as any)['Flash'],
        whiteBalance: (tags as any).Exif?.whitebalance || (tags as any)['WhiteBalance'],
        
        // GPS information
        gps: {
          latitude: (tags as any).GPS?.latitude || (tags as any)['GPS Latitude'],
          longitude: (tags as any).GPS?.longitude || (tags as any)['GPS Longitude'],
          altitude: (tags as any).GPS?.altitude || (tags as any)['GPS Altitude'],
          latitudeRef: (tags as any).GPS?.latituderef || (tags as any)['GPS LatitudeRef'],
          longitudeRef: (tags as any).GPS?.longituderef || (tags as any)['GPS LongitudeRef'],
          altitudeRef: (tags as any).GPS?.altituderef || (tags as any)['GPS AltitudeRef'],
        },
        
        // Orientation
        orientation: (tags as any).Image?.orientation || (tags as any)['Orientation'],
        
        // Color space
        colorSpace: (tags as any).Image?.colorspace || (tags as any)['ColorSpace'],
        
        // Resolution
        xResolution: (tags as any).Image?.xresolution || (tags as any)['X Resolution'],
        yResolution: (tags as any).Image?.yresolution || (tags as any)['Y Resolution'],
        resolutionUnit: (tags as any).Image?.resolutionunit || (tags as any)['Resolution Unit'],
        
        // Other metadata
        artist: (tags as any).Image?.artist || (tags as any)['Artist'],
        copyright: (tags as any).Image?.copyright || (tags as any)['Copyright'],
        imageDescription: (tags as any).Image?.imagedescription || (tags as any)['Image Description'],
      };

      // Clean up undefined values
      Object.keys(exifData.exif).forEach(key => {
        if (exifData.exif[key] === undefined) {
          delete exifData.exif[key];
        }
      });

      // Clean up GPS if no GPS data
      if (exifData.exif.gps && Object.values(exifData.exif.gps).every(val => val === undefined)) {
        delete exifData.exif.gps;
      }
    }

    // Add file type detection
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      exifData.fileType = 'JPEG';
    } else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      exifData.fileType = 'PNG';
    } else if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      exifData.fileType = 'GIF';
    } else {
      exifData.fileType = 'Unknown';
    }

    // If no EXIF data found, try to extract basic image dimensions
    if (!exifData.hasExif) {
      const dimensions = extractBasicImageDimensions(buffer);
      if (dimensions) {
        exifData.imageWidth = dimensions.width;
        exifData.imageHeight = dimensions.height;
      }
    }

  } catch (error) {
    console.error('Error extracting EXIF data:', error);
    exifData.error = error instanceof Error ? error.message : 'Unknown error';
    
    // Fallback to basic image dimension extraction
    const dimensions = extractBasicImageDimensions(buffer);
    if (dimensions) {
      exifData.imageWidth = dimensions.width;
      exifData.imageHeight = dimensions.height;
    }
  }

  return exifData;
}

function extractBasicImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  // For JPEG files, look for SOF (Start of Frame) markers
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    for (let i = 2; i < buffer.length - 1; i++) {
      if (buffer[i] === 0xFF && (buffer[i + 1] >= 0xC0 && buffer[i + 1] <= 0xC3)) {
        // Found SOF marker, extract dimensions
        const height = (buffer[i + 5] << 8) | buffer[i + 6];
        const width = (buffer[i + 7] << 8) | buffer[i + 8];
        return { width, height };
      }
    }
  }
  
  // For PNG files
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    const width = (buffer[16] << 24) | (buffer[17] << 16) | (buffer[18] << 8) | buffer[19];
    const height = (buffer[20] << 24) | (buffer[21] << 16) | (buffer[22] << 8) | buffer[23];
    return { width, height };
  }
  
  return null;
}
