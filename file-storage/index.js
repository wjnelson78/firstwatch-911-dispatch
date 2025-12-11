/**
 * FirstWatch File Storage Service
 * 
 * MinIO-based file storage service for handling images, videos,
 * documents, and other media files for the FirstWatch 911 Dispatch platform.
 * 
 * @author William Nelson
 * @created December 2025
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Client } = require('minio');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3001', 'https://snocodispatch.com'],
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// MinIO client configuration
const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || '172.16.32.206',
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY
});

// Bucket names
const BUCKETS = {
  feedImages: process.env.BUCKET_FEED_IMAGES || 'feed-images',
  feedVideos: process.env.BUCKET_FEED_VIDEOS || 'feed-videos',
  incidentAttachments: process.env.BUCKET_INCIDENT_ATTACHMENTS || 'incident-attachments',
  userAvatars: process.env.BUCKET_USER_AVATARS || 'user-avatars'
};

// Multer configuration for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedMimes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Videos
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Audio
    'audio/mpeg',
    'audio/wav',
    'audio/webm',
    'audio/ogg'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max file size
  }
});

// Helper: Get bucket based on file type
function getBucketForFile(mimetype, category) {
  if (category === 'avatar') return BUCKETS.userAvatars;
  if (category === 'incident') return BUCKETS.incidentAttachments;
  
  if (mimetype.startsWith('video/')) return BUCKETS.feedVideos;
  return BUCKETS.feedImages;
}

// Helper: Generate unique filename
function generateFilename(originalName) {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const uuid = uuidv4().slice(0, 8);
  return `${timestamp}-${uuid}${ext}`;
}

// Helper: Get public URL for file
function getPublicUrl(bucket, filename) {
  const endpoint = process.env.MINIO_ENDPOINT || '172.16.32.206';
  const port = process.env.MINIO_PORT || 9000;
  return `http://${endpoint}:${port}/${bucket}/${filename}`;
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const buckets = await minioClient.listBuckets();
    res.json({ 
      status: 'healthy',
      minio: 'connected',
      buckets: buckets.map(b => b.name)
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message 
    });
  }
});

// Upload single file
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const category = req.body.category || 'feed';
    const bucket = getBucketForFile(req.file.mimetype, category);
    const filename = generateFilename(req.file.originalname);

    // Upload to MinIO
    await minioClient.putObject(
      bucket,
      filename,
      req.file.buffer,
      req.file.size,
      { 'Content-Type': req.file.mimetype }
    );

    const url = getPublicUrl(bucket, filename);

    res.json({
      success: true,
      file: {
        filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        bucket,
        url
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload multiple files
app.post('/upload/multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const category = req.body.category || 'feed';
    const uploadedFiles = [];

    for (const file of req.files) {
      const bucket = getBucketForFile(file.mimetype, category);
      const filename = generateFilename(file.originalname);

      await minioClient.putObject(
        bucket,
        filename,
        file.buffer,
        file.size,
        { 'Content-Type': file.mimetype }
      );

      uploadedFiles.push({
        filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        bucket,
        url: getPublicUrl(bucket, filename)
      });
    }

    res.json({
      success: true,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete file
app.delete('/delete/:bucket/:filename', async (req, res) => {
  try {
    const { bucket, filename } = req.params;

    // Validate bucket
    if (!Object.values(BUCKETS).includes(bucket)) {
      return res.status(400).json({ error: 'Invalid bucket' });
    }

    await minioClient.removeObject(bucket, filename);

    res.json({
      success: true,
      message: `File ${filename} deleted from ${bucket}`
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get presigned URL for direct upload (optional, for large files)
app.post('/presigned-url', async (req, res) => {
  try {
    const { filename, mimetype, category } = req.body;

    if (!filename || !mimetype) {
      return res.status(400).json({ error: 'filename and mimetype required' });
    }

    const bucket = getBucketForFile(mimetype, category || 'feed');
    const uniqueFilename = generateFilename(filename);

    // Generate presigned PUT URL (valid for 1 hour)
    const presignedUrl = await minioClient.presignedPutObject(
      bucket,
      uniqueFilename,
      60 * 60 // 1 hour
    );

    res.json({
      success: true,
      presignedUrl,
      filename: uniqueFilename,
      bucket,
      publicUrl: getPublicUrl(bucket, uniqueFilename)
    });
  } catch (error) {
    console.error('Presigned URL error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List files in bucket
app.get('/list/:bucket', async (req, res) => {
  try {
    const { bucket } = req.params;
    const { prefix, limit } = req.query;

    if (!Object.values(BUCKETS).includes(bucket)) {
      return res.status(400).json({ error: 'Invalid bucket' });
    }

    const files = [];
    const stream = minioClient.listObjects(bucket, prefix || '', true);

    stream.on('data', (obj) => {
      if (!limit || files.length < parseInt(limit)) {
        files.push({
          name: obj.name,
          size: obj.size,
          lastModified: obj.lastModified,
          url: getPublicUrl(bucket, obj.name)
        });
      }
    });

    stream.on('end', () => {
      res.json({ files });
    });

    stream.on('error', (err) => {
      res.status(500).json({ error: err.message });
    });
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 100MB.' });
    }
    return res.status(400).json({ error: error.message });
  }
  
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`File storage service running on port ${PORT}`);
  console.log(`MinIO endpoint: ${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`);
  console.log('Buckets:', Object.values(BUCKETS));
});
