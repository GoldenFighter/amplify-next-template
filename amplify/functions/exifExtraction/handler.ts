import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { S3Event, S3EventRecord } from 'aws-lambda';
import ExifReader from 'exif-reader';

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
    const tags = ExifReader.load(buffer);
    
    if (tags && Object.keys(tags).length > 0) {
      exifData.hasExif = true;
      
      // Extract comprehensive EXIF data
      exifData.exif = {
        // Image dimensions
        imageWidth: tags.image?.width?.value || tags['Image Width']?.value,
        imageHeight: tags.image?.height || tags['Image Height']?.value,
        
        // Camera information
        make: tags.image?.make?.value || tags['Make']?.value,
        model: tags.image?.model?.value || tags['Model']?.value,
        software: tags.image?.software?.value || tags['Software']?.value,
        
        // Date and time
        dateTime: tags.image?.datetime?.value || tags['DateTime']?.value,
        dateTimeOriginal: tags.exif?.datetimeoriginal?.value || tags['DateTimeOriginal']?.value,
        dateTimeDigitized: tags.exif?.datetimedigitized?.value || tags['DateTimeDigitized']?.value,
        
        // Camera settings
        fNumber: tags.exif?.fnumber?.value || tags['FNumber']?.value,
        exposureTime: tags.exif?.exposuretime?.value || tags['ExposureTime']?.value,
        iso: tags.exif?.iso?.value || tags['ISO']?.value,
        focalLength: tags.exif?.focallength?.value || tags['FocalLength']?.value,
        flash: tags.exif?.flash?.value || tags['Flash']?.value,
        whiteBalance: tags.exif?.whitebalance?.value || tags['WhiteBalance']?.value,
        
        // GPS information
        gps: {
          latitude: tags.gps?.latitude?.value || tags['GPS Latitude']?.value,
          longitude: tags.gps?.longitude?.value || tags['GPS Longitude']?.value,
          altitude: tags.gps?.altitude?.value || tags['GPS Altitude']?.value,
          latitudeRef: tags.gps?.latituderef?.value || tags['GPS LatitudeRef']?.value,
          longitudeRef: tags.gps?.longituderef?.value || tags['GPS LongitudeRef']?.value,
          altitudeRef: tags.gps?.altituderef?.value || tags['GPS AltitudeRef']?.value,
        },
        
        // Orientation
        orientation: tags.image?.orientation?.value || tags['Orientation']?.value,
        
        // Color space
        colorSpace: tags.image?.colorspace?.value || tags['ColorSpace']?.value,
        
        // Resolution
        xResolution: tags.image?.xresolution?.value || tags['X Resolution']?.value,
        yResolution: tags.image?.yresolution?.value || tags['Y Resolution']?.value,
        resolutionUnit: tags.image?.resolutionunit?.value || tags['Resolution Unit']?.value,
        
        // Other metadata
        artist: tags.image?.artist?.value || tags['Artist']?.value,
        copyright: tags.image?.copyright?.value || tags['Copyright']?.value,
        imageDescription: tags.image?.imagedescription?.value || tags['Image Description']?.value,
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
