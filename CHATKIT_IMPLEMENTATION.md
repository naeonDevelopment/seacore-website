# ChatKit Integration - Implementation Guide

## 🆕 Latest Updates (October 2025)

### ✅ Fixed Issues
1. **Modal Positioning & Sizing** - Properly centered, fully visible, smooth animations
   - Mobile: Safe margins with `inset-4` (1rem on all sides)
   - Desktop: Perfect centering with `left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`
   - Width: `90vw` max on desktop (was too wide, caused cutoff)
   - Max width: `3xl` instead of `4xl` for better fit
   - Keyboard-friendly: Uses `h-auto` on mobile to prevent viewport conflicts
   - Z-index normalized to 9998/9999 (was causing render issues at max values)
   - Slide-in animation: Smoothly animates from bottom with `y: 100` to `y: 0`
   - Removed hard shadow: Replaced `shadow-[8px_8px_0px_#2a3442]` with soft `shadow-2xl`

2. **Streaming Responses** - Real-time word-by-word message delivery
   - Server-Sent Events (SSE) implementation
   - Animated typing cursor
   - Better perceived performance

3. **Chain of Thought Visibility** - See AI reasoning process
   - Blue "Thinking" boxes show AI's analysis
   - Transparent reasoning before answers
   - Enhanced trust and understanding

### 🎓 Comprehensive Training Documentation
- System prompt engineering guide
- Fine-tuning options and costs
- RAG integration roadmap
- Hybrid enterprise approaches

---

## ✅ What We've Built

### 1. **Cloudflare Functions (Serverless Backend)**

#### `/functions/api/chatkit/start.ts`
- Creates new ChatKit sessions with OpenAI
- Securely uses `OPENAI_API_KEY` from environment variables
- Returns client secret for frontend authentication
- **Maritime-trained instructions** embedded in session initialization

#### `/functions/api/chatkit/refresh.ts`
- Refreshes expired ChatKit sessions
- Maintains conversation continuity
- Secure token rotation

### 2. **React Component**

#### `/src/components/layout/ChatKitWidget.tsx`
- Embeds ChatKit widget on all pages
- Auto-loads ChatKit SDK from CDN
- Connects to your Cloudflare proxy functions
- Styled with fleetcore branding (ocean blue #0ea5e9)
- Positioned bottom-right corner

### 3. **App Integration**

#### Modified `/src/App.tsx`
- Added ChatKitWidget component
- Widget appears on all pages
- Non-intrusive floating button

---

## 🤖 Maritime Expertise Training

The chatbot is trained with:

### Domain Knowledge
- Maritime maintenance management systems (PMS)
- SOLAS/MARPOL regulatory compliance
- Fleet management and technical operations
- Preventive maintenance scheduling
- Equipment lifecycle management
- Spare parts inventory management

### fleetcore-Specific Features
- Dual-interval task tracking
- Automated PMS schedule generation
- Cross-fleet intelligence
- SOLAS 2024 compliance
- Multi-tenant architecture
- Digital documentation

### Website Navigation
- Can guide users to Home, Platform, Solutions, About, Contact pages
- Understands site structure and content
- Offers demo scheduling via Calendly

---

## 🚀 How to Deploy

### 1. **Environment Variable (Already Done ✅)**
```bash
# In Cloudflare Dashboard:
# Settings > Environment Variables
OPENAI_API_KEY = sk-proj-xxxxxxxxxxxxx
```

### 2. **Deploy to Cloudflare**
```bash
# Commit changes
git add .
git commit -m "Add ChatKit AI assistant integration"

# Push to trigger Cloudflare Pages deployment
git push origin main
```

### 3. **Verify Deployment**
After deployment:
1. Visit https://fleetcore.ai
2. Look for chat bubble in bottom-right corner
3. Click to start conversation
4. Test with maritime questions

---

## 🧪 Testing the Chatbot

### Test Queries

1. **General Maritime:**
   - "What is preventive maintenance in maritime?"
   - "Explain SOLAS compliance requirements"
   - "What is a PMS system?"

2. **fleetcore-Specific:**
   - "How does fleetcore handle dual-interval tracking?"
   - "What's the difference between fleetcore and traditional CMMS?"
   - "Can you explain the automated scheduling feature?"

3. **Navigation:**
   - "Show me the platform features"
   - "I want to learn about your solutions"
   - "How do I schedule a demo?"

---

## 🎨 Customization Options

### Modal Appearance & Positioning
The chat modal uses a responsive positioning strategy with smooth animations:
- **Mobile** (`< 640px`): 
  - `inset-4` provides 1rem safe margins on all sides
  - `h-auto` prevents viewport height conflicts
  - No transform-based centering (lets content flow naturally)
- **Desktop** (`>= 640px`):
  - Centered using `left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`
  - `w-[90vw]` ensures full visibility without cutoff
  - `h-[85vh]` with `max-h-[700px]` for consistent sizing
  - `max-w-3xl` for optimal reading width (not too wide)
- **Animations**:
  - Slides in from bottom: `initial={{ y: 100 }}` → `animate={{ y: 0 }}`
  - Smooth fade: `opacity: 0` → `opacity: 1`
  - Exit animation: Slides back down and fades out
- **Shadows**: Soft `shadow-2xl` on modal, `shadow-lg` on elements (no hard shadows)
- **Z-index**: Modal at 9999, backdrop at 9998 (below Navigation at 2147483000)
- **Keyboard-friendly**: Mobile auto-height prevents viewport conflicts when keyboard appears

### Streaming & Chain of Thought
✅ **Real-time Streaming Responses**: Messages stream word-by-word for better UX
✅ **Visible Chain of Thought**: See AI reasoning process in blue "Thinking" boxes
✅ **Typing Indicators**: Animated cursor shows streaming progress

Edit `/src/components/layout/ChatModal.tsx` to customize:
```typescript
// Adjust thinking display
{message.thinking && (
  <div className="mb-3 p-3 rounded-xl bg-blue-50/80">
    <Brain className="w-4 h-4" /> {/* Chain of thought icon */}
    <span>Thinking</span>
    <p>{message.thinking}</p>
  </div>
)}
```

---

## 🧠 LLM Training & Fine-Tuning Guide

### Current Architecture: Prompt Engineering

**Important**: The chatbot currently uses **prompt engineering**, not model training. The base model is GPT-4 Turbo.

#### How It Works:
1. **System Prompt** (in `/functions/api/chatkit/chat.ts`):
   - Defines the AI's role, expertise, and behavior
   - Provides domain knowledge (maritime, fleetcore features)
   - Sets communication style guidelines

2. **Context Window**: Each conversation includes:
   ```typescript
   const conversationMessages = [
     { role: 'system', content: SYSTEM_PROMPT },  // Your custom instructions
     ...messages,  // User conversation history
   ];
   ```

3. **Temperature & Parameters**:
   ```typescript
   temperature: 0.7,        // Creativity vs consistency (0.0-2.0)
   max_tokens: 800,         // Response length limit
   presence_penalty: 0.6,   // Avoid repetition
   frequency_penalty: 0.3,  // Encourage variety
   ```

### Customization Methods (Ranked by Effort)

#### 1️⃣ **Easy: Update System Prompt** (5 minutes)
Edit `SYSTEM_PROMPT` in `/functions/api/chatkit/chat.ts`:

```typescript
const SYSTEM_PROMPT = `You are a maritime maintenance expert assistant for fleetcore.ai.

Your expertise includes:
- Maritime maintenance management systems (PMS)
- SOLAS/MARPOL regulatory compliance
- [ADD YOUR CUSTOM EXPERTISE HERE]

Key fleetcore capabilities:
- [UPDATE WITH NEW FEATURES]

Communication style:
- [CUSTOMIZE TONE AND APPROACH]
`;
```

**Use Cases**:
- Add new product features
- Update regulatory information
- Change personality/tone
- Add industry-specific knowledge

#### 2️⃣ **Medium: Dynamic Context Injection** (1-2 hours)
Load knowledge from external sources in real-time:

```typescript
// Fetch latest product docs
const productDocs = await fetch('/api/docs/latest').then(r => r.json());

// Build dynamic system prompt
const SYSTEM_PROMPT = `${BASE_PROMPT}

Current Product Features:
${productDocs.features.map(f => `- ${f.name}: ${f.description}`).join('\n')}

Recent Updates:
${productDocs.updates.join('\n')}
`;
```

**Use Cases**:
- Real-time product updates
- User-specific customization
- Regional compliance variations
- A/B testing different approaches

#### 3️⃣ **Advanced: RAG (Retrieval-Augmented Generation)** (1-2 weeks)
Integrate vector database for intelligent knowledge retrieval:

**Architecture**:
```typescript
// 1. Embed user question
const questionEmbedding = await openai.embeddings.create({
  model: 'text-embedding-ada-002',
  input: userQuestion,
});

// 2. Search vector database (Pinecone, Weaviate, Supabase Vector)
const relevantDocs = await vectorDB.query({
  vector: questionEmbedding.data[0].embedding,
  topK: 5,
});

// 3. Inject into context
const ENHANCED_PROMPT = `${SYSTEM_PROMPT}

Relevant Knowledge:
${relevantDocs.map(d => d.content).join('\n\n')}
`;
```

**Implementation Steps**:
1. Choose vector database (Supabase Vector, Pinecone, Weaviate)
2. Embed your documentation/knowledge base
3. Create search endpoint
4. Modify chat function to query before responding

**Use Cases**:
- Large knowledge bases (> 10K words)
- Technical documentation
- Policy/compliance documents
- Historical conversation learning

#### 4️⃣ **Expert: OpenAI Fine-Tuning** (2-4 weeks + $$)
Train a custom model on your specific data:

**When to Use**:
- Need consistent brand voice across thousands of conversations
- Have >1,000 high-quality training examples
- Require specialized maritime terminology
- Want to reduce response latency
- Need cost optimization for high volume

**Process**:
```typescript
// 1. Prepare training data (JSONL format)
// File: training_data.jsonl
{"messages": [
  {"role": "system", "content": "You are a maritime expert..."},
  {"role": "user", "content": "How does preventive maintenance work?"},
  {"role": "assistant", "content": "Preventive maintenance in maritime..."}
]}

// 2. Upload to OpenAI
const file = await openai.files.create({
  file: fs.createReadStream('training_data.jsonl'),
  purpose: 'fine-tune',
});

// 3. Create fine-tuning job
const fineTune = await openai.fineTuning.jobs.create({
  training_file: file.id,
  model: 'gpt-4-0613',
  hyperparameters: {
    n_epochs: 3,
  },
});

// 4. Use fine-tuned model
const response = await openai.chat.completions.create({
  model: fineTune.fine_tuned_model,  // Your custom model
  messages: conversationMessages,
});
```

**Costs**:
- Training: $8.00 per 1M tokens
- Usage: ~2x base model cost
- Example: 10K conversations × 500 tokens = $40 training cost

**Data Requirements**:
- Minimum: 50 examples (recommended: 500+)
- Format: Conversational JSONL
- Quality: Reviewed by domain experts
- Diversity: Cover all use cases

### 5️⃣ **Enterprise: Hybrid Approach** (1-3 months)
Combine multiple methods for optimal results:

```typescript
// Multi-layer intelligence
async function generateResponse(userMessage) {
  // Layer 1: RAG - retrieve relevant docs
  const docs = await searchKnowledgeBase(userMessage);
  
  // Layer 2: Fine-tuned model for domain expertise
  const fineTunedResponse = await callFineTunedModel({
    context: docs,
    message: userMessage,
  });
  
  // Layer 3: GPT-4 for complex reasoning
  const finalResponse = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'assistant', content: fineTunedResponse },
      { role: 'user', content: 'Enhance and verify this response' },
    ],
  });
  
  return finalResponse;
}
```

---

## 📊 Comparison Matrix

| Method | Setup Time | Cost | Accuracy | Update Speed | Best For |
|--------|-----------|------|----------|--------------|----------|
| **System Prompt** | 5 mins | Free | Good | Instant | Quick changes, small knowledge |
| **Dynamic Context** | 2 hours | Free | Good | Real-time | Product updates, personalization |
| **RAG** | 1-2 weeks | Low | Great | Hours | Large knowledge bases |
| **Fine-Tuning** | 2-4 weeks | High | Excellent | Days | Brand voice, high volume |
| **Hybrid** | 1-3 months | Medium-High | Superior | Mixed | Enterprise solutions |

---

## 🎯 Recommended Next Steps

### For fleetcore (Current State):

**Phase 1: Enhanced Prompt Engineering** (This Week)
```typescript
// Add more detailed maritime knowledge
// Include specific SOLAS/MARPOL articles
// Add common troubleshooting scenarios
// Update with latest fleetcore features
```

**Phase 2: RAG Integration** (Next Month)
```typescript
// Set up Supabase Vector database
// Embed technical documentation
// Index SOLAS/MARPOL regulations
// Create intelligent document retrieval
```

**Phase 3: Fine-Tuning** (3-6 Months)
```typescript
// Collect 500+ high-quality conversations
// Label and categorize interactions
// Create training dataset
// Train custom maritime model
```

---

## 🛠️ Quick Customization Examples

### Add New Feature
```typescript
// In /functions/api/chatkit/chat.ts
const SYSTEM_PROMPT = `...
New fleetcore capabilities:
- AI-powered predictive maintenance (2025 release)
- IoT sensor integration for real-time monitoring
- Automated regulatory compliance reporting
`;
```

### Change Personality
```typescript
const SYSTEM_PROMPT = `...
Communication style:
- Friendly and enthusiastic (not formal)
- Use maritime analogies
- Include relevant emojis ⚓️🚢
- Keep responses under 3 paragraphs
`;
```

### Add Region-Specific Knowledge
```typescript
// Detect user region and inject specific regulations
const userRegion = detectRegion(userIP);
const regionalCompliance = getRegionalRules(userRegion);

const SYSTEM_PROMPT = `...
Regional Compliance (${userRegion}):
${regionalCompliance}
`;
```

---

## 🔐 Security Features

✅ **API Key Protection**
- Never exposed to frontend
- Stored in Cloudflare environment variables
- Only accessible to serverless functions

✅ **Rate Limiting**
- 20 requests per minute per user
- Prevents abuse and cost overruns

✅ **Session Management**
- Ephemeral client secrets
- Automatic session refresh
- Secure token rotation

---

## 💰 Cost Estimate

### OpenAI ChatKit Pricing
- **GPT-4 Turbo:** ~$0.01 per 1K input tokens, ~$0.03 per 1K output tokens
- **Average conversation:** 50-100 messages = ~$0.50-1.00
- **Expected monthly (5K conversations):** $2,500-5,000

### Cloudflare Pages Functions
- **Free tier:** 100K requests/month
- **Paid:** $0.50 per million requests
- Your usage will likely stay in free tier

---

## 🐛 Troubleshooting

### Widget Not Appearing
1. Check browser console for errors
2. Verify `OPENAI_API_KEY` is set in Cloudflare
3. Check network tab for `/api/chatkit/start` requests
4. Ensure Cloudflare Pages deployment succeeded

### "Failed to start session" Error
1. Verify API key is valid
2. Check OpenAI account has ChatKit access
3. Review Cloudflare Functions logs
4. Check API key has sufficient credits

### Session Expires Too Quickly
- Sessions expire after 1 hour by default
- Refresh function handles this automatically
- Check `/api/chatkit/refresh` is working

---

## 📊 Monitoring

### Cloudflare Analytics
- Go to Cloudflare Dashboard > Analytics
- Monitor function invocations
- Track error rates
- View latency metrics

### OpenAI Usage Dashboard
- Visit https://platform.openai.com/usage
- Monitor token consumption
- Set spending limits
- Track API key usage

---

## 🔄 Next Steps

### Phase 1: Basic Testing (This Week)
- [ ] Deploy to production
- [ ] Test on multiple pages
- [ ] Verify maritime expertise
- [ ] Check mobile responsiveness

### Phase 2: Enhancements (Next Week)
- [ ] Add conversation history
- [ ] Implement user authentication
- [ ] Add analytics tracking
- [ ] A/B test greeting messages

### Phase 3: Advanced Features (Future)
- [ ] Voice input support
- [ ] Multi-language support
- [ ] Integration with Calendly API
- [ ] Custom knowledge base RAG
- [ ] User feedback system

---

## 📞 Support

### OpenAI ChatKit Docs
https://platform.openai.com/docs/guides/chatkit

### Cloudflare Functions Docs
https://developers.cloudflare.com/pages/functions

### Need Help?
- Check OpenAI API status: https://status.openai.com
- Check Cloudflare status: https://www.cloudflarestatus.com
- Review function logs in Cloudflare Dashboard

---

## 🎉 Success Criteria

✅ Widget appears on all pages  
✅ Can answer maritime questions accurately  
✅ Guides users to correct website sections  
✅ Offers demo scheduling  
✅ Mobile responsive  
✅ Fast response times (< 3 seconds)  
✅ No API key exposure  
✅ Rate limiting works  

---

**Built with ❤️ for fleetcore.ai**

