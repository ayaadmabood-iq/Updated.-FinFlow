-- Update storage bucket to add text/html MIME type (without deleting)
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'text/plain', 'text/csv', 'text/markdown', 'text/html', 'application/xhtml+xml',
  'application/pdf', 'application/json', 'application/xml',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'audio/mpeg', 'audio/wav', 'audio/mp3',
  'video/mp4'
]
WHERE id = 'project-documents';