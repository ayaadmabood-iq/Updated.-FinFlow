# FineFlow Training & Fine-Tuning

## Overview

FineFlow enables creating training datasets from document chunks and submitting them for OpenAI fine-tuning.

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Documents   │───>│   Chunks     │───>│   Dataset    │───>│   Training   │
│  (Processed) │    │  (Selected)  │    │   (Pairs)    │    │    Job       │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

## Dataset Builder Flow

### Step 1: Select Source Content

**From Project Documents:**
- Navigate to project detail
- View processed documents with chunks
- Select documents to include

**Automatic Selection:**
- All chunks from ready documents
- Excludes duplicates (`is_duplicate = false`)
- Filters by quality score (optional)

### Step 2: Generate Dataset

**Create Dataset Dialog:**
```typescript
interface GenerateDatasetInput {
  projectId: string;
  datasetName: string;
  format: 'openai' | 'anthropic' | 'alpaca' | 'sharegpt';
  mode: 'auto' | 'qa' | 'instruction' | 'conversation';
  systemPrompt?: string;
  documentIds?: string[];  // Optional: specific documents
}
```

**Generation Modes:**

| Mode | Description | Best For |
|------|-------------|----------|
| Auto | AI determines best pair type | Mixed content |
| Q&A | Question-answer pairs | FAQs, documentation |
| Instruction | Task-response pairs | How-to guides |
| Conversation | Dialog exchanges | Chat training |

**Format Options:**

| Format | Structure | Use Case |
|--------|-----------|----------|
| OpenAI | `{messages: [{role, content}]}` | GPT fine-tuning |
| Anthropic | `{prompt, completion}` | Claude fine-tuning |
| Alpaca | `{instruction, input, output}` | Open-source models |
| ShareGPT | `{conversations: [...]}` | LLaMA variants |

### Step 3: AI Pair Generation

For each chunk, the system:

1. **Prepares prompt** with chunk content
2. **Calls Lovable AI Gateway** (Gemini Flash)
3. **Parses AI response** into Q&A pairs
4. **Validates pairs** for quality
5. **Stores in database**

**AI Safety Guards:**
- Prompt injection detection on input chunks
- Safe system prompt with guidelines
- Output sanitization before parsing
- Filter pairs with suspicious content

### Step 4: Review & Edit

**Dataset Detail Page:**
- View all generated pairs
- Edit user/assistant messages
- Delete low-quality pairs
- Add system prompt

**Pair Editor:**
```typescript
interface TrainingPair {
  id: string;
  systemMessage?: string;
  userMessage: string;
  assistantMessage: string;
  qualityScore?: number;
  tokenCount?: number;
  isValid: boolean;
}
```

### Step 5: Validation

**Automatic Validation:**
```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];      // Blocking issues
  warnings: string[];    // Non-blocking issues
  stats: {
    totalPairs: number;
    avgTokensPerPair: number;
    avgQualityScore: number;
    uniqueQuestions: number;
  };
}
```

**Validation Rules:**
- Minimum 10 pairs required
- No empty messages
- Token limit check (4096 for OpenAI)
- Duplicate detection

### Step 6: Export JSONL

**Download Options:**
- Raw JSONL file
- Format-specific structure

**OpenAI Format Example:**
```json
{"messages":[{"role":"system","content":"You are a helpful assistant"},{"role":"user","content":"What is..."},{"role":"assistant","content":"It is..."}]}
{"messages":[{"role":"user","content":"How do..."},{"role":"assistant","content":"You can..."}]}
```

---

## Training Job Lifecycle

### Starting Training

**Prerequisites:**
1. Dataset in `ready` status
2. OpenAI API key configured
3. Sufficient dataset size (10+ pairs)

**Start Training Request:**
```typescript
{
  datasetId: string;
  baseModel: string;  // e.g., "gpt-4o-mini-2024-07-18"
  apiKey: string;     // User's OpenAI API key
  trainingConfig?: {
    nEpochs?: number;           // Default: 3
    batchSize?: number;         // Default: auto
    learningRateMultiplier?: number;  // Default: 1.0
  };
}
```

### Job Status Flow

```
pending → uploading → validating → queued → training → completed
                 ↓         ↓          ↓         ↓
              failed    failed     failed   cancelled
```

| Status | Description |
|--------|-------------|
| pending | Job created, not started |
| uploading | Uploading JSONL to OpenAI |
| validating | OpenAI validating file |
| queued | Waiting in OpenAI queue |
| training | Active training |
| completed | Training finished successfully |
| failed | Error occurred |
| cancelled | Cancelled by user |

### Progress Tracking

**Polling Mechanism:**
- Edge function polls OpenAI every 30 seconds
- Updates `training_jobs` table
- Maximum polling: 6 hours

**Progress Updates:**
```typescript
{
  status: 'training',
  progress_percent: 65,
  current_step: 'Training... (15000 tokens trained)'
}
```

### Real-time Updates

**Supabase Realtime:**
```typescript
// Frontend subscription
const channel = supabase
  .channel(`training-${jobId}`)
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'training_jobs', filter: `id=eq.${jobId}` },
    (payload) => updateJobStatus(payload.new)
  )
  .subscribe();
```

### Cancellation

**Cancel Conditions:**
- Status must be: pending, queued, uploading, validating, training
- User must own the job

**Cancel Process:**
1. Call `cancel-training` edge function
2. If `provider_job_id` exists, call OpenAI cancel API
3. Update `training_jobs.status` to 'cancelled'
4. Reset `training_datasets.status` to 'ready'

---

## Cost Estimation

### Before Training

**Estimated Cost Calculation:**
```typescript
const costPerMillionTokens = {
  openai: 8.0,      // GPT-4o-mini fine-tuning
  anthropic: 15.0,
  alpaca: 0,        // Self-hosted
  sharegpt: 0       // Self-hosted
};

const estimatedCost = (totalTokens / 1000000) * rate;
```

### Cost Preview Modal

Shows before starting training:
- Estimated training cost
- Current budget status
- Projected impact on monthly budget

### Budget Guard

**Check Before Training:**
```typescript
const budgetCheck = await budgetService.checkBudget(
  projectId,
  estimatedCost
);

if (!budgetCheck.allowed) {
  // Show warning or abort based on enforcement mode
}
```

---

## API Key Management

### Storing API Keys

**User API Keys Table:**
```sql
user_api_keys (
  user_id UUID PRIMARY KEY,
  openai_key_encrypted TEXT,
  openai_key_set BOOLEAN,
  anthropic_key_encrypted TEXT,
  anthropic_key_set BOOLEAN
)
```

**Encryption:**
- Keys encrypted with `API_KEY_ENCRYPTION_SECRET`
- Only encrypted value stored
- Decryption happens in edge functions

### Setting API Key

Via `manage-api-keys` edge function:
```typescript
// Set key
await supabase.functions.invoke('manage-api-keys', {
  body: {
    action: 'set',
    provider: 'openai',
    apiKey: 'sk-...'
  }
});

// Check key status
await supabase.functions.invoke('manage-api-keys', {
  body: { action: 'status' }
});
```

---

## Training Data Quality

### Quality Scoring

Each chunk and pair has a quality score (0-1):

**Chunk Quality Factors:**
- Length (not too short/long)
- Vocabulary diversity
- Structural elements (headings, lists)
- Sentence coherence

**Pair Quality Factors:**
- Response length
- Factual grounding
- Diversity from other pairs

### Best Practices

1. **Use high-quality source documents**
   - Well-structured content
   - Accurate information
   - Clear language

2. **Review generated pairs**
   - Edit vague responses
   - Remove off-topic pairs
   - Ensure factual accuracy

3. **Add system prompts**
   - Define assistant behavior
   - Set response style
   - Include domain context

4. **Use appropriate formats**
   - OpenAI format for GPT models
   - Alpaca for open-source fine-tuning

---

## Limitations

### Current Limitations

| Feature | Status | Notes |
|---------|--------|-------|
| OpenAI fine-tuning | ✅ Implemented | Full integration |
| Anthropic fine-tuning | ❌ Not implemented | Format supported, API not integrated |
| Self-hosted training | ❌ Not implemented | Export JSONL only |
| Validation API | ❌ Not implemented | Basic validation, not OpenAI endpoint |
| Training metrics | ⚠️ Basic | Only final metrics, no loss curves |
| Model comparison | ❌ Not implemented | UI exists but not functional |
| Auto-training | ⚠️ Disabled | Feature exists but not exposed |

### Token Limits

- OpenAI: 4096 tokens per pair (recommended)
- Minimum pairs: 10
- Maximum pairs: No hard limit (cost consideration)

### Rate Limits

- OpenAI Files API: 100 MB/file
- Fine-tuning jobs: Based on organization limits
- Pair generation: ~3 pairs per chunk
