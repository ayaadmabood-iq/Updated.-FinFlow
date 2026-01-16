# FineFlow User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Projects](#projects)
3. [Documents](#documents)
4. [Search](#search)
5. [Training Data](#training-data)
6. [Settings](#settings)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Creating an Account

1. Navigate to the app URL
2. Click **"Sign Up"**
3. Enter your email and password (minimum 8 characters)
4. You'll be automatically logged in

### Dashboard Overview

The dashboard displays:
- **Recent Projects**: Quick access to your projects
- **Activity Feed**: Recent document processing
- **Quota Usage**: Documents, processing, storage limits

---

## Projects

### Creating a Project

1. Click **"New Project"**
2. Enter project name and description
3. Click **"Create"**

### Project Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Chunk Size | Characters per chunk | 1000 |
| Chunk Overlap | Overlap between chunks | 200 |
| Chunk Strategy | `fixed`, `sentence`, `semantic` | fixed |
| Monthly Budget | Spending limit (USD) | $100 |

---

## Documents

### Uploading Files

1. Open a project
2. **Drag and drop** files or click **"Upload"**
3. Processing starts automatically

**Supported Formats:** PDF, DOCX, TXT, MD, HTML, JSON, CSV  
**Size Limit:** 50 MB per file

### Document Status

| Status | Meaning |
|--------|---------|
| `uploaded` | File stored, waiting to process |
| `processing` | Pipeline running |
| `ready` | Processing complete |
| `error` | Processing failed |

### Viewing Results

- **Summary**: AI-generated overview
- **Chunks**: View document segments
- **Download**: Get original file

---

## Search

### Using Search

1. Go to **Search** page
2. Enter your query in natural language
3. Results show relevance scores

### Search Types

- **Semantic Search**: Finds meaning-related content
- **Full-Text Search**: Keyword matching
- **Hybrid**: Combines both (default)

### Filters

- Project filter
- File type filter
- Date range
- Language

---

## Training Data

### Creating a Dataset

1. Go to **Datasets** → **"New Dataset"**
2. Name your dataset
3. Select source documents or chunks
4. Click **"Generate"** to create Q&A pairs

### Editing Pairs

- Click any pair to edit
- Approve/reject pairs for quality
- Export when ready

### Starting Fine-Tuning

1. Open dataset → **"Start Training"**
2. Configure base model and epochs
3. Review cost estimate
4. Click **"Start"**

---

## Settings

### Profile

- Update display name
- Change password

### Language

Available: English, Arabic, Spanish, French, German, Chinese, Hindi

### Teams

- Create teams for collaboration
- Invite members with roles: Owner, Admin, Editor, Viewer

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't upload files | Check quota limits |
| Processing stuck | Resume from failed stage |
| Search returns nothing | Ensure documents are "ready" status |
| Missing features | Check subscription tier |

---

## Related Documentation

- [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) - Feature overview
- [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md) - Technical details
