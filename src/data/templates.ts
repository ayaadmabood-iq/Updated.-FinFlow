// Industry templates for AI fine-tuning projects

export interface TemplateTrainingPair {
  system: string;
  user: string;
  assistant: string;
}

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  icon: string;
  systemPrompt: string;
  samplePairs: TemplateTrainingPair[];
  recommendedModel: string;
  estimatedTokens: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

export type TemplateCategory = 
  | 'customer-support'
  | 'healthcare'
  | 'legal'
  | 'ecommerce'
  | 'education'
  | 'finance';

export const categoryInfo: Record<TemplateCategory, { label: string; labelAr: string; color: string }> = {
  'customer-support': { label: 'Customer Support', labelAr: 'دعم العملاء', color: 'bg-blue-500' },
  'healthcare': { label: 'Healthcare', labelAr: 'الرعاية الصحية', color: 'bg-green-500' },
  'legal': { label: 'Legal', labelAr: 'القانون', color: 'bg-purple-500' },
  'ecommerce': { label: 'E-commerce', labelAr: 'التجارة الإلكترونية', color: 'bg-orange-500' },
  'education': { label: 'Education', labelAr: 'التعليم', color: 'bg-yellow-500' },
  'finance': { label: 'Finance', labelAr: 'المالية', color: 'bg-emerald-500' },
};

export const templates: Template[] = [
  // Customer Support Templates
  {
    id: 'cs-faq-bot',
    name: 'FAQ Chatbot',
    category: 'customer-support',
    description: 'Train a bot to answer frequently asked questions about your product or service with accurate, helpful responses.',
    icon: 'MessageCircleQuestion',
    systemPrompt: 'You are a helpful customer support agent. Answer questions accurately and politely based on the company knowledge base. If you are unsure, ask for clarification or suggest contacting human support.',
    samplePairs: [
      {
        system: 'You are a helpful customer support agent for TechCorp.',
        user: 'What are your business hours?',
        assistant: 'Our customer support team is available Monday through Friday, 9 AM to 6 PM EST. For urgent matters outside these hours, you can reach our 24/7 emergency line at 1-800-TECHCORP.'
      },
      {
        system: 'You are a helpful customer support agent for TechCorp.',
        user: 'How do I reset my password?',
        assistant: 'To reset your password: 1) Go to the login page, 2) Click "Forgot Password", 3) Enter your email address, 4) Check your inbox for a reset link, 5) Follow the link to create a new password. The link expires in 24 hours.'
      },
      {
        system: 'You are a helpful customer support agent for TechCorp.',
        user: 'Do you offer refunds?',
        assistant: 'Yes, we offer a 30-day money-back guarantee on all purchases. To request a refund, please contact our support team with your order number. Refunds are typically processed within 5-7 business days.'
      }
    ],
    recommendedModel: 'gpt-4o-mini-2024-07-18',
    estimatedTokens: 5000,
    difficulty: 'beginner',
    tags: ['faq', 'chatbot', 'support', 'automation']
  },
  {
    id: 'cs-ticket-classifier',
    name: 'Ticket Classifier',
    category: 'customer-support',
    description: 'Automatically categorize and prioritize support tickets based on content, urgency, and customer sentiment.',
    icon: 'Tags',
    systemPrompt: 'You are a support ticket classifier. Analyze incoming tickets and classify them by category, priority, and sentiment. Provide structured JSON output.',
    samplePairs: [
      {
        system: 'Classify this support ticket into category, priority (low/medium/high/urgent), and sentiment (positive/neutral/negative).',
        user: 'I\'ve been waiting 3 weeks for my order and nobody is responding to my emails! This is unacceptable!',
        assistant: '{"category": "shipping", "priority": "urgent", "sentiment": "negative", "suggested_action": "Escalate to shipping team immediately, send apology email with tracking update"}'
      },
      {
        system: 'Classify this support ticket into category, priority (low/medium/high/urgent), and sentiment (positive/neutral/negative).',
        user: 'Just wanted to say thanks for the quick delivery. The product works great!',
        assistant: '{"category": "feedback", "priority": "low", "sentiment": "positive", "suggested_action": "Log as positive feedback, consider for testimonial request"}'
      }
    ],
    recommendedModel: 'gpt-4o-mini-2024-07-18',
    estimatedTokens: 3000,
    difficulty: 'intermediate',
    tags: ['classification', 'automation', 'tickets', 'nlp']
  },
  {
    id: 'cs-sentiment',
    name: 'Sentiment Analyzer',
    category: 'customer-support',
    description: 'Detect customer emotions and satisfaction levels from feedback, reviews, and conversations.',
    icon: 'Heart',
    systemPrompt: 'You are a sentiment analysis expert. Analyze text for emotional tone, satisfaction level, and key concerns. Provide actionable insights.',
    samplePairs: [
      {
        system: 'Analyze the sentiment and provide a detailed breakdown.',
        user: 'The app crashes every time I try to upload a file. I\'ve tried reinstalling but nothing works. Very frustrated.',
        assistant: '{"overall_sentiment": "negative", "emotion": "frustration", "satisfaction": 2, "key_issues": ["app crashes", "upload functionality", "reinstall unsuccessful"], "urgency": "high", "recommended_response_tone": "empathetic and solution-focused"}'
      }
    ],
    recommendedModel: 'gpt-4o-mini-2024-07-18',
    estimatedTokens: 2500,
    difficulty: 'beginner',
    tags: ['sentiment', 'analysis', 'emotions', 'feedback']
  },
  
  // Healthcare Templates
  {
    id: 'hc-medical-qa',
    name: 'Medical Q&A Assistant',
    category: 'healthcare',
    description: 'Answer general health questions with medically accurate information while recommending professional consultation for specific diagnoses.',
    icon: 'Stethoscope',
    systemPrompt: 'You are a medical information assistant. Provide accurate, evidence-based health information while always recommending consultation with healthcare professionals for specific medical advice. Never provide diagnoses.',
    samplePairs: [
      {
        system: 'You are a medical information assistant. Provide helpful information but remind users to consult healthcare providers.',
        user: 'What are the symptoms of the common cold?',
        assistant: 'Common cold symptoms typically include: runny or stuffy nose, sore throat, sneezing, mild headache, fatigue, and sometimes a low-grade fever. Symptoms usually peak around day 2-3 and improve within 7-10 days. If symptoms persist beyond 10 days or worsen significantly, please consult a healthcare provider.'
      },
      {
        system: 'You are a medical information assistant. Provide helpful information but remind users to consult healthcare providers.',
        user: 'How much water should I drink daily?',
        assistant: 'General guidelines suggest about 8 glasses (64 oz) of water daily, but individual needs vary based on activity level, climate, and health conditions. Signs of adequate hydration include clear to light yellow urine. Consult your doctor if you have kidney issues or other conditions affecting fluid intake.'
      }
    ],
    recommendedModel: 'gpt-4o-2024-08-06',
    estimatedTokens: 8000,
    difficulty: 'advanced',
    tags: ['medical', 'health', 'qa', 'information']
  },
  {
    id: 'hc-symptom-checker',
    name: 'Symptom Triage',
    category: 'healthcare',
    description: 'Help patients describe symptoms and understand when to seek medical care, without providing diagnoses.',
    icon: 'Activity',
    systemPrompt: 'You are a symptom triage assistant. Help users articulate their symptoms clearly and guide them on appropriate levels of care (self-care, schedule appointment, urgent care, emergency). Never diagnose.',
    samplePairs: [
      {
        system: 'Help the user understand the urgency of their symptoms without diagnosing.',
        user: 'I have a headache and slight fever for 2 days',
        assistant: 'Based on your symptoms (headache and slight fever for 2 days), this could be consistent with a common viral infection. Self-care suggestions: rest, hydration, over-the-counter pain relievers. Seek medical attention if: fever exceeds 103°F, severe headache, stiff neck, confusion, or symptoms worsen after 3-4 days. Would you like to describe any additional symptoms?'
      }
    ],
    recommendedModel: 'gpt-4o-2024-08-06',
    estimatedTokens: 6000,
    difficulty: 'advanced',
    tags: ['symptoms', 'triage', 'healthcare', 'guidance']
  },
  
  // Legal Templates
  {
    id: 'lg-contract-analysis',
    name: 'Contract Analyzer',
    category: 'legal',
    description: 'Extract key terms, identify risks, and summarize legal contracts with structured analysis.',
    icon: 'FileText',
    systemPrompt: 'You are a legal document analyst. Extract key terms, obligations, deadlines, and potential risks from contracts. Provide structured summaries while noting this is not legal advice.',
    samplePairs: [
      {
        system: 'Analyze this contract clause and extract key information.',
        user: 'The Licensee agrees to pay a monthly fee of $500, due on the 1st of each month. Late payments will incur a 5% penalty. The agreement is for 12 months with automatic renewal unless cancelled with 30 days notice.',
        assistant: '**Contract Analysis:**\n\n**Financial Terms:**\n- Monthly fee: $500\n- Due date: 1st of each month\n- Late penalty: 5%\n\n**Duration:**\n- Initial term: 12 months\n- Renewal: Automatic\n- Cancellation notice: 30 days\n\n**Key Risks:**\n- Auto-renewal may lead to unintended contract extension\n- Late payment penalties can accumulate\n\n*Note: This is an informational summary, not legal advice.*'
      }
    ],
    recommendedModel: 'gpt-4o-2024-08-06',
    estimatedTokens: 10000,
    difficulty: 'advanced',
    tags: ['contracts', 'legal', 'analysis', 'documents']
  },
  {
    id: 'lg-compliance',
    name: 'Compliance Assistant',
    category: 'legal',
    description: 'Help identify compliance requirements and check documents against regulatory standards.',
    icon: 'Shield',
    systemPrompt: 'You are a compliance assistant. Help identify relevant regulations, check documents for compliance issues, and suggest improvements. Always recommend verification by qualified legal professionals.',
    samplePairs: [
      {
        system: 'Review this policy for GDPR compliance concerns.',
        user: 'Our privacy policy states we collect user emails and share them with marketing partners.',
        assistant: '**GDPR Compliance Review:**\n\n**Issues Identified:**\n1. **Consent**: No mention of explicit consent for data sharing\n2. **Purpose Limitation**: Sharing with "marketing partners" is vague\n3. **Data Subject Rights**: No mention of right to opt-out\n\n**Recommendations:**\n- Add explicit consent mechanism for data sharing\n- Specify which partners receive data and why\n- Include clear opt-out instructions\n- Add data retention period information\n\n*Please have a qualified legal professional verify compliance.*'
      }
    ],
    recommendedModel: 'gpt-4o-2024-08-06',
    estimatedTokens: 7000,
    difficulty: 'advanced',
    tags: ['compliance', 'gdpr', 'regulations', 'legal']
  },
  
  // E-commerce Templates
  {
    id: 'ec-product-recommendations',
    name: 'Product Recommender',
    category: 'ecommerce',
    description: 'Suggest relevant products based on customer preferences, browsing history, and purchase patterns.',
    icon: 'ShoppingCart',
    systemPrompt: 'You are a product recommendation assistant. Suggest relevant products based on customer preferences and needs. Be helpful and not pushy, focusing on genuine value.',
    samplePairs: [
      {
        system: 'Recommend products based on customer preferences.',
        user: 'I\'m looking for a gift for my dad who likes gardening and is turning 60.',
        assistant: 'Great gift ideas for a gardening enthusiast turning 60:\n\n**Top Picks:**\n1. **Ergonomic Garden Tool Set** ($45) - Easy on joints, highly rated\n2. **Smart Plant Monitor** ($35) - Tracks soil moisture and light\n3. **Raised Garden Bed Kit** ($89) - Easier on the back\n\n**Premium Option:**\n- **Premium Seed Subscription** ($120/year) - Monthly heirloom seeds\n\nWould you like more details on any of these, or should I suggest something else?'
      }
    ],
    recommendedModel: 'gpt-4o-mini-2024-07-18',
    estimatedTokens: 4000,
    difficulty: 'beginner',
    tags: ['recommendations', 'products', 'shopping', 'personalization']
  },
  {
    id: 'ec-order-support',
    name: 'Order Support Agent',
    category: 'ecommerce',
    description: 'Handle order inquiries, track shipments, process returns, and resolve common order issues.',
    icon: 'Package',
    systemPrompt: 'You are an order support specialist. Help customers with order tracking, returns, exchanges, and shipping issues. Be empathetic and solution-oriented.',
    samplePairs: [
      {
        system: 'Help the customer with their order inquiry.',
        user: 'Order #12345 was supposed to arrive yesterday but it hasn\'t. Can you help?',
        assistant: 'I\'m sorry your order hasn\'t arrived yet. Let me help you with Order #12345.\n\n**Current Status:** I\'ll look up the tracking information for you.\n\n**Next Steps:**\n1. Check if there\'s a "delivered" notification (sometimes packages are left in unexpected spots)\n2. If not found, I can initiate a trace with the carrier\n3. If the package is confirmed lost, we\'ll send a replacement or full refund\n\nCould you confirm your shipping address so I can verify the delivery details?'
      }
    ],
    recommendedModel: 'gpt-4o-mini-2024-07-18',
    estimatedTokens: 4500,
    difficulty: 'beginner',
    tags: ['orders', 'shipping', 'returns', 'support']
  },
  
  // Education Templates
  {
    id: 'ed-tutor',
    name: 'AI Tutor',
    category: 'education',
    description: 'Provide personalized tutoring with explanations adapted to student level and learning style.',
    icon: 'GraduationCap',
    systemPrompt: 'You are a patient, encouraging tutor. Explain concepts clearly, use examples, check for understanding, and adapt your explanations to the student\'s level. Encourage questions.',
    samplePairs: [
      {
        system: 'You are tutoring a high school student in algebra.',
        user: 'I don\'t understand how to solve quadratic equations.',
        assistant: 'Let\'s break down quadratic equations step by step!\n\n**What is a quadratic equation?**\nIt\'s an equation like: ax² + bx + c = 0\n\n**Three ways to solve them:**\n\n1. **Factoring** (when it\'s simple)\n   Example: x² + 5x + 6 = 0 → (x+2)(x+3) = 0 → x = -2 or x = -3\n\n2. **Quadratic Formula** (works always)\n   x = (-b ± √(b²-4ac)) / 2a\n\n3. **Completing the Square** (useful technique)\n\nLet\'s try one together: x² + 4x + 3 = 0\n\nCan you try factoring this? What two numbers multiply to 3 and add to 4?'
      }
    ],
    recommendedModel: 'gpt-4o-2024-08-06',
    estimatedTokens: 6000,
    difficulty: 'intermediate',
    tags: ['tutoring', 'education', 'learning', 'personalized']
  },
  {
    id: 'ed-quiz-generator',
    name: 'Quiz Generator',
    category: 'education',
    description: 'Create quizzes and assessments with varying difficulty levels and question types.',
    icon: 'ClipboardCheck',
    systemPrompt: 'You are an educational assessment expert. Create clear, fair, and pedagogically sound quiz questions at various difficulty levels. Include answer keys and explanations.',
    samplePairs: [
      {
        system: 'Generate quiz questions on the given topic.',
        user: 'Create 3 questions about photosynthesis for 8th grade science.',
        assistant: '**Photosynthesis Quiz - 8th Grade**\n\n**Q1 (Easy):** What gas do plants absorb during photosynthesis?\na) Oxygen\nb) Carbon dioxide\nc) Nitrogen\nd) Hydrogen\n\n**Q2 (Medium):** Write the balanced equation for photosynthesis.\n\n**Q3 (Hard):** Explain why plants appear green and how this relates to photosynthesis.\n\n---\n**Answer Key:**\n\n1. **b) Carbon dioxide** - Plants take in CO₂ and release O₂\n\n2. **6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂**\n\n3. Plants appear green because chlorophyll reflects green light while absorbing red and blue light for photosynthesis. The absorbed light energy powers the conversion of CO₂ and water into glucose.'
      }
    ],
    recommendedModel: 'gpt-4o-mini-2024-07-18',
    estimatedTokens: 5000,
    difficulty: 'intermediate',
    tags: ['quizzes', 'assessment', 'education', 'testing']
  },
  
  // Finance Templates
  {
    id: 'fn-advisor',
    name: 'Financial Advisor',
    category: 'finance',
    description: 'Provide general financial education and guidance on budgeting, saving, and investing basics.',
    icon: 'PiggyBank',
    systemPrompt: 'You are a financial education assistant. Provide general financial guidance and education. Always note that specific advice should come from a licensed financial advisor based on individual circumstances.',
    samplePairs: [
      {
        system: 'Provide general financial education without specific investment advice.',
        user: 'How should I start investing with $1000?',
        assistant: '**Getting Started with $1,000 - General Guidance**\n\n**Before Investing:**\n✓ Build an emergency fund (3-6 months expenses)\n✓ Pay off high-interest debt first\n\n**Beginner-Friendly Options:**\n1. **Index Funds** - Diversified, low fees (e.g., S&P 500 funds)\n2. **Robo-Advisors** - Automated portfolio management\n3. **Target-Date Funds** - Adjusts risk as you age\n\n**Key Principles:**\n- Start early (compound interest is powerful)\n- Diversify across assets\n- Keep fees low\n- Invest regularly (dollar-cost averaging)\n\n*This is educational information. Please consult a licensed financial advisor for personalized advice based on your situation.*'
      }
    ],
    recommendedModel: 'gpt-4o-2024-08-06',
    estimatedTokens: 7000,
    difficulty: 'intermediate',
    tags: ['finance', 'investing', 'budgeting', 'education']
  },
  {
    id: 'fn-expense-analyzer',
    name: 'Expense Analyzer',
    category: 'finance',
    description: 'Categorize expenses, identify spending patterns, and suggest budget optimizations.',
    icon: 'Receipt',
    systemPrompt: 'You are a personal finance analyst. Categorize expenses, identify patterns, and suggest practical ways to optimize spending while maintaining quality of life.',
    samplePairs: [
      {
        system: 'Analyze the spending data and provide insights.',
        user: 'My monthly expenses: Rent $1500, Food $800, Subscriptions $150, Transport $300, Shopping $400, Entertainment $200',
        assistant: '**Monthly Expense Analysis**\n\n**Total:** $3,350/month\n\n**Breakdown by Category:**\n- 🏠 Housing: $1,500 (45%) - Within recommended 30% if income is $5k+\n- 🍔 Food: $800 (24%) - Higher than typical\n- 🚗 Transport: $300 (9%) - Reasonable\n- 🛍️ Shopping: $400 (12%)\n- 🎬 Entertainment: $200 (6%)\n- 📱 Subscriptions: $150 (4%)\n\n**Optimization Suggestions:**\n1. **Food ($800)** - Consider meal planning; potential savings: $200-300\n2. **Subscriptions ($150)** - Audit for unused services; potential savings: $30-50\n3. **Shopping ($400)** - Implement 24-hour rule for purchases\n\n**Potential Monthly Savings:** $250-400'
      }
    ],
    recommendedModel: 'gpt-4o-mini-2024-07-18',
    estimatedTokens: 4000,
    difficulty: 'beginner',
    tags: ['expenses', 'budgeting', 'analysis', 'savings']
  }
];

export function getTemplatesByCategory(category: TemplateCategory): Template[] {
  return templates.filter(t => t.category === category);
}

export function getTemplateById(id: string): Template | undefined {
  return templates.find(t => t.id === id);
}

export function searchTemplates(query: string): Template[] {
  const lowerQuery = query.toLowerCase();
  return templates.filter(t => 
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}
