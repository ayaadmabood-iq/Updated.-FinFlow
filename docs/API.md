# FineFlow API Documentation

## Overview

FineFlow uses Supabase Edge Functions for backend operations. All endpoints require authentication via JWT token in the Authorization header.

## Authentication

All requests must include:
```
Authorization: Bearer <access_token>
```

## Edge Functions

### Health Check
**GET** `/functions/v1/health`

Returns system health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00Z"
}
```

---

### Document Processing
**POST** `/functions/v1/process-document`

Processes a document for text extraction and embedding generation.

**Request Body:**
```json
{
  "documentId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "documentId": "uuid",
  "status": "ready"
}
```

**Error Codes:**
- `401` - Unauthorized
- `404` - Document not found
- `422` - Processing failed
- `429` - Quota exceeded

---

### Semantic Search
**POST** `/functions/v1/semantic-search`

Performs semantic search across documents.

**Request Body:**
```json
{
  "query": "search text",
  "projectId": "uuid (optional)",
  "mimeTypes": ["application/pdf"] (optional),
  "limit": 10 (optional)
}
```

**Response:**
```json
{
  "results": [
    {
      "documentId": "uuid",
      "documentName": "file.pdf",
      "content": "matched text...",
      "similarity": 0.85
    }
  ]
}
```

---

### Quota Status
**GET** `/functions/v1/quota-status`

Returns current user's quota usage.

**Response:**
```json
{
  "tier": "free",
  "documents": { "current": 5, "limit": 10 },
  "processing": { "current": 3, "limit": 20 },
  "storage": { "current": 5242880, "limit": 104857600 }
}
```

---

### Send Notification
**POST** `/functions/v1/send-notification`

Creates a notification for a user (system use only).

**Request Body:**
```json
{
  "user_id": "uuid",
  "type": "processing_complete",
  "title": "Document Ready",
  "message": "Your document has been processed.",
  "data": {} (optional)
}
```

---

### Export Document
**POST** `/functions/v1/export-document`

Exports document in specified format.

**Request Body:**
```json
{
  "documentId": "uuid",
  "format": "json" | "csv" | "txt"
}
```

---

### Admin Stats
**GET** `/functions/v1/admin-stats`

Returns admin dashboard statistics (admin only).

---

### Admin Users
**GET/PATCH** `/functions/v1/admin-users`

Manage users (admin only).

## Error Response Format

All errors return:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Notification Types

| Type | Description |
|------|-------------|
| `processing_complete` | Document processing finished successfully |
| `processing_failed` | Document processing failed |
| `quota_warning` | User is nearing quota limit (80%) |
| `quota_exceeded` | User has reached quota limit |
