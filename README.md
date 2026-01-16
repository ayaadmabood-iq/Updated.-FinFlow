<p align="center">
  <img src="public/placeholder.svg" alt="FineFlow Logo" width="120" height="120" />
</p>

<h1 align="center">FineFlow</h1>

<p align="center">
  <strong>Smart Document Intelligence Platform for AI Training</strong>
</p>

<p align="center">
  <em>Transform your documents into AI-ready training data in minutes, not months.</em>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-use-cases">Use Cases</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="README_AR.md">العربية</a>
</p>

---

## 🚀 What is FineFlow?

**FineFlow** is an end-to-end document intelligence platform that transforms your documents into high-quality AI training data. Whether you're building a customer support chatbot, a legal assistant, or a domain-specific AI model, FineFlow streamlines the entire pipeline from document ingestion to fine-tuned model deployment.

### Who Is It For?

| Audience | Use Case |
|----------|----------|
| **Developers** | Build custom AI models with your domain data |
| **Businesses** | Create intelligent chatbots from internal knowledge |
| **Researchers** | Analyze and process academic papers at scale |
| **Educators** | Create Q&A datasets from educational materials |

---

## ✨ Features

| Category | Features |
|----------|----------|
| 📄 **Document Processing** | PDF, DOCX, TXT, HTML, Images, Audio/Video • OCR • Smart summarization |
| 🧠 **Training Data** | Auto Q&A generation • Multiple formats (OpenAI, Anthropic, Alpaca) • Quality scoring |
| ⚡ **Fine-Tuning** | OpenAI integration • BYOK • Real-time progress • Checkpoint management |
| 📁 **Projects** | Team collaboration • Version control • Audit logging |
| 🔍 **Search** | Semantic search • Cross-project • Advanced filters |
| 🌍 **Multilingual** | 7 languages • Full RTL support • Auto language detection |
| 🔒 **Security** | BYOK • Row-level security • Role-based access |

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|--------------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Shadcn/UI, React Query, i18next |
| **Backend** | Supabase, PostgreSQL, Edge Functions, Row-Level Security |
| **AI** | OpenAI GPT-4, Whisper, Embeddings, Fine-Tuning API |

---

## 📖 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/bun
- A Supabase account ([create one here](https://supabase.com))
- An OpenAI API key (for AI features)

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd fineflow-foundation-main
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Set up environment variables**

   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and fill in your credentials. The `.env.example` file contains comprehensive documentation for each variable.

   **Required Variables (Essential):**
   - `VITE_SUPABASE_PROJECT_ID` - Your Supabase project ID
   - `VITE_SUPABASE_URL` - Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon/public key
   - `VITE_SUPABASE_ANON_KEY` - Same as PUBLISHABLE_KEY (used in some components)
   - `INTERNAL_FUNCTION_SECRET` - Generate with `openssl rand -hex 32`

   **Required for AI Features:**
   - `OPENAI_API_KEY` - Your OpenAI API key (for GPT models, embeddings, fine-tuning)
   - `ANTHROPIC_API_KEY` - Your Anthropic API key (optional, for Claude models)

   **Optional (Recommended for Production):**
   - `VITE_SENTRY_DSN` - Error tracking and monitoring
   - `API_KEY_ENCRYPTION_SECRET` - For encrypting user API keys in database
   - `VITE_SLACK_WEBHOOK_URL` - For system alerts and notifications

   > ⚠️ **Security Note**: Never commit `.env` to version control. It's already in `.gitignore`.

   **Where to Find Credentials:**
   - **Supabase**: [Dashboard](https://supabase.com/dashboard) → Your Project → Settings → API
   - **OpenAI**: [Platform](https://platform.openai.com/api-keys) → API Keys
   - **Anthropic**: [Console](https://console.anthropic.com/settings/keys) → API Keys

   > 🔒 **Internal Function Security**: The `INTERNAL_FUNCTION_SECRET` protects internal Edge Functions from unauthorized access. This secret must be set in **both** your local `.env` file and in Supabase Dashboard → Edge Functions → Secrets. See [INTERNAL_FUNCTION_AUTH.md](./INTERNAL_FUNCTION_AUTH.md) for details.

   > 📖 **Full Variable Reference**: See `.env.example` for the complete list of all environment variables with detailed descriptions and setup instructions.

4. **Run the development server**
   ```bash
   npm run dev
   # or
   bun dev
   ```

### Usage

1. **Create Account** → Sign up with email
2. **Add API Key** → Settings → API Keys → Enter OpenAI key
3. **Create Project** → New Project → Name & description
4. **Upload Documents** → Drag & drop files
5. **Generate Training Data** → Training tab → Generate Dataset
6. **Start Fine-Tuning** → Select dataset → Start Training
7. **Test & Export** → Test model → Export

---

## 🎯 Use Cases

- 🎧 **Customer Support AI** - Train on support tickets
- ⚖️ **Legal Analysis** - Process contracts and legal docs
- 📚 **Educational Content** - Create Q&A from textbooks
- 🔬 **Research Assistant** - Analyze research papers
- ✍️ **Content Creation** - Generate brand-consistent content
- 🌐 **Multilingual Training** - Train in multiple languages

---

## 💰 Pricing

| | Free | Starter | Pro | Enterprise |
|--|------|---------|-----|------------|
| Projects | 3 | 10 | Unlimited | Unlimited |
| Documents | 50 | 500 | 5,000 | Unlimited |
| Storage | 100 MB | 1 GB | 10 GB | Custom |

---

## 🗺️ Roadmap

- [ ] Model Deployment Hub
- [ ] Anthropic Claude Integration
- [ ] HuggingFace Integration
- [ ] Mobile App
- [ ] On-Premise Deployment

---

## 📄 License

MIT License

---

<p align="center">Built with ❤️ by the FineFlow Team</p>
