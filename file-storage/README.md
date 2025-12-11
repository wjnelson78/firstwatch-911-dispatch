# FirstWatch File Storage Service

MinIO-based object storage service for the FirstWatch 911 Dispatch platform.

## Features

- **Image uploads** - JPEG, PNG, GIF, WebP, SVG
- **Video uploads** - MP4, WebM, QuickTime, AVI
- **Document uploads** - PDF, Word documents
- **Audio uploads** - MP3, WAV, WebM, OGG
- **Presigned URLs** - For direct large file uploads
- **File deletion** - Remove files from storage
- **File listing** - List files in buckets

## MinIO Server

The MinIO server is hosted at `172.16.32.206` with the following configuration:

- **API Port**: 9000
- **Console Port**: 9001
- **Console URL**: http://172.16.32.206:9001

### Buckets

| Bucket | Purpose | Public Access |
|--------|---------|---------------|
| `feed-images` | Community feed images | Yes (download) |
| `feed-videos` | Community feed videos | Yes (download) |
| `incident-attachments` | Incident report files | No |
| `user-avatars` | User profile pictures | Yes (download) |

## Installation

```bash
cd file-storage
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

## API Endpoints

### Health Check
```
GET /health
```

### Upload Single File
```
POST /upload
Content-Type: multipart/form-data

Fields:
- file: The file to upload
- category: (optional) 'feed', 'incident', or 'avatar'
```

### Upload Multiple Files
```
POST /upload/multiple
Content-Type: multipart/form-data

Fields:
- files: Array of files (max 10)
- category: (optional) 'feed', 'incident', or 'avatar'
```

### Delete File
```
DELETE /delete/:bucket/:filename
```

### Get Presigned Upload URL
```
POST /presigned-url
Content-Type: application/json

{
  "filename": "example.jpg",
  "mimetype": "image/jpeg",
  "category": "feed"
}
```

### List Files
```
GET /list/:bucket?prefix=&limit=
```

## Integration

To use from the dashboard:

```typescript
const STORAGE_URL = 'http://172.16.32.206:3002';

// Upload a file
const formData = new FormData();
formData.append('file', file);
formData.append('category', 'feed');

const response = await fetch(`${STORAGE_URL}/upload`, {
  method: 'POST',
  body: formData
});

const data = await response.json();
console.log(data.file.url); // Public URL to the file
```

## PM2 Deployment

```bash
pm2 start index.js --name file-storage
pm2 save
```
