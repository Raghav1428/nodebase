# Nodebase: AI and IoT-Powered Cloud Workflow Automation Platform

## 1. Title

**"Design and Development of AI and IoT Applications in Cloud Environment: A Visual Workflow Automation Platform"**

## 2. Problem Statement

Modern businesses and developers face significant challenges in automating complex workflows that integrate artificial intelligence capabilities with Internet of Things (IoT) devices. Traditional automation solutions require extensive coding knowledge, lack visual interfaces for workflow design, and struggle to seamlessly integrate multiple AI providers and IoT data sources. Additionally, managing AI model interactions, maintaining conversation context, and processing real-time IoT sensor data requires sophisticated orchestration that is difficult to implement and maintain.

## 3. Elaborated Problem Statement

### 3.1 Current Challenges

**3.1.1 Fragmented AI Integration**
- Businesses need to work with multiple AI providers (OpenAI, Anthropic, Google Gemini, OpenRouter) but lack a unified platform
- Each AI provider requires different API implementations and credential management
- Maintaining conversation history and context across AI interactions is complex
- No standardized way to orchestrate AI models with databases for persistent conversations

**3.1.2 IoT Data Processing Complexity**
- IoT devices generate continuous streams of sensor data that need real-time processing
- Webhook-based IoT integrations require custom endpoint development and maintenance
- No visual interface to design IoT data processing workflows
- Difficulty in triggering automated actions based on IoT sensor readings

**3.1.3 Workflow Automation Limitations**
- Existing automation tools (Zapier, Make.com) have limited AI capabilities and IoT integrations
- Custom automation solutions require extensive programming knowledge
- Serverless workflow execution needs proper orchestration and error handling
- Real-time status updates and execution monitoring are challenging to implement

**3.1.4 Cloud Infrastructure Management**
- Deploying and scaling automation workflows requires cloud infrastructure expertise
- Managing serverless function execution, database connections, and API rate limiting
- Ensuring high availability and fault tolerance for critical workflows
- Monitoring and debugging distributed workflow executions

### 3.2 Solution Requirements

The platform must provide:
- **Visual Workflow Designer**: Drag-and-drop interface for creating workflows without coding
- **Multi-AI Provider Support**: Unified interface for OpenAI, Anthropic, Gemini, and OpenRouter
- **AI Agent Orchestration**: Intelligent agents that manage AI models with persistent database storage
- **IoT Integration Capabilities**: Webhook endpoints for receiving IoT data and HTTP requests for device control
- **Cloud-Native Architecture**: Serverless execution, auto-scaling, and distributed processing
- **Real-time Monitoring**: Live execution status updates and comprehensive error tracking

## 4. Objectives

### 4.1 Primary Objectives

1. **Develop a Visual Workflow Automation Platform**
   - Create an intuitive drag-and-drop interface for workflow design
   - Implement node-based architecture for modular workflow components
   - Support complex workflow topologies with conditional branching

2. **Integrate Multiple AI Providers**
   - Support OpenAI, Anthropic (Claude), Google Gemini, and OpenRouter
   - Implement AI Agent nodes that orchestrate AI models with databases
   - Enable conversation history management with PostgreSQL and MongoDB
   - Provide chat model nodes with context-aware prompting

3. **Enable IoT Device Integration**
   - Implement webhook trigger nodes for receiving IoT sensor data
   - Support HTTP request nodes for IoT device API interactions
   - Enable scheduled triggers for periodic IoT data collection
   - Process and route IoT data through AI-powered workflows

4. **Build Cloud-Native Infrastructure**
   - Deploy on serverless cloud platforms (Vercel/Next.js)
   - Implement distributed workflow execution using Inngest
   - Integrate PostgreSQL for workflow and execution data storage
   - Utilize Upstash Redis for rate limiting and caching

5. **Provide Real-time Execution Monitoring**
   - Implement live status updates using Inngest Realtime
   - Track workflow execution progress and node-level status
   - Provide comprehensive error logging and debugging capabilities
   - Enable execution history and result inspection

### 4.2 Secondary Objectives

1. **Security and Credential Management**
   - Encrypt and securely store API credentials
   - Implement user-based credential isolation
   - Support multiple credential types per user

2. **Scalability and Performance**
   - Support concurrent workflow executions
   - Implement efficient workflow topological sorting
   - Optimize AI API calls with proper error handling

3. **Extensibility**
   - Support Model Context Protocol (MCP) for tool integration
   - Enable custom node development
   - Provide webhook-based extensibility

## 5. Design and Development of AI and IoT Applications in Cloud Environment

### 5.1 System Architecture

#### 5.1.1 Cloud Infrastructure Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloud Infrastructure                      │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 15)                                       │
│  - React Flow for visual workflow editor                     │
│  - Real-time status updates via Inngest Realtime            │
│  - Server-side rendering and API routes                     │
├─────────────────────────────────────────────────────────────┤
│  Backend Services                                            │
│  - Inngest: Serverless workflow orchestration               │
│  - PostgreSQL: Workflow metadata and execution history       │
│  - Upstash Redis: Rate limiting and caching                  │
│  - Sentry: Error monitoring and tracking                    │
├─────────────────────────────────────────────────────────────┤
│  External Integrations                                        │
│  - AI Providers: OpenAI, Anthropic, Gemini, OpenRouter      │
│  - Databases: User-provided PostgreSQL/MongoDB               │
│  - Communication: Discord, Slack, Telegram webhooks           │
│  - IoT Devices: Via webhook endpoints                       │
└─────────────────────────────────────────────────────────────┘
```

#### 5.1.2 Technology Stack

**Frontend:**
- Next.js 15 with App Router
- React 19 with TypeScript
- React Flow (XYFlow) for visual workflow editor
- Tailwind CSS for styling
- Radix UI components
- Jotai for state management
- tRPC for type-safe API calls

**Backend:**
- Next.js API Routes
- Inngest for serverless workflow execution
- Prisma ORM for database access
- PostgreSQL for primary data storage
- Upstash Redis for rate limiting
- Better Auth for authentication

**AI Integration:**
- Vercel AI SDK for unified AI provider interface
- @ai-sdk/openai, @ai-sdk/anthropic, @ai-sdk/google
- @openrouter/ai-sdk-provider for OpenRouter
- Model Context Protocol (MCP) SDK for tool integration

**IoT Integration:**
- Webhook endpoints for receiving IoT data
- HTTP request nodes for IoT device control
- Scheduled triggers for periodic data collection

### 5.2 AI Application Design and Implementation

#### 5.2.1 AI Provider Integration Architecture

The platform supports four major AI providers through a unified interface:

**File: `src/features/executions/components/openai/executor.ts`**
```typescript
// OpenAI integration using Vercel AI SDK
const openai = createOpenAI({ apiKey: decrypt(credential.value) });
const { steps } = await step.ai.wrap("openai-generate-text", generateText, {
    model: openai(data.model || "gpt-4o-mini"),
    system: systemPrompt,
    prompt: userPrompt,
});
```

**Supported AI Providers:**
1. **OpenAI** (`src/features/executions/components/openai/`)
   - Models: GPT-4, GPT-4o-mini, GPT-3.5-turbo
   - Features: Text generation, chat models with conversation history

2. **Anthropic** (`src/features/executions/components/anthropic/`)
   - Models: Claude 3 Opus, Sonnet, Haiku
   - Features: Advanced reasoning, long context windows

3. **Google Gemini** (`src/features/executions/components/gemini/`)
   - Models: Gemini Pro, Gemini Ultra
   - Features: Multimodal capabilities, Google ecosystem integration

4. **OpenRouter** (`src/features/executions/components/openrouter/`)
   - Models: Access to 100+ AI models through unified API
   - Features: Model routing, cost optimization

#### 5.2.2 AI Agent Node Design

The AI Agent node (`src/features/executions/components/ai-agent/executor.ts`) is a sophisticated orchestration component that:

**Architecture:**
```
AI Agent Node
├── AI Model Node (OpenAI/Anthropic/Gemini/OpenRouter Chat Model)
├── Database Node (PostgreSQL/MongoDB) [Optional]
└── Execution Flow:
    1. Query chat history from database (if connected)
    2. Pass history to AI model with user prompt
    3. Generate AI response
    4. Save response to database (if connected)
    5. Return combined result
```

**Key Features:**
- **Conversation Persistence**: Maintains chat history in PostgreSQL or MongoDB
- **Context Window Management**: Configurable context window size (default: 20 messages)
- **Automatic Table Creation**: Creates chat history tables if they don't exist
- **Token-Optimized Format**: Uses TOON (Token-Optimized Object Notation) for efficient storage

**Implementation Details:**
```typescript
// From src/features/executions/components/ai-agent/executor.ts
// 1. Find connected AI model and database nodes
const foundModelNode = allConnectedNodes.find(n => 
    AI_MODEL_NODE_TYPES.includes(n.type)
);

// 2. Retrieve chat history if database connected
if (databaseNode) {
    const postgresExecutor = getExecutor(NodeType.POSTGRES);
    updatedContext = await postgresExecutor({
        context: { ...updatedContext, _postgresOperation: 'query' }
    });
    chatHistory = postgresResult?.chatHistory || [];
}

// 3. Generate AI response with history
const chatModelExecutor = getExecutor(modelNode.type);
updatedContext = await chatModelExecutor({
    context: { ...updatedContext, _chatHistory: chatHistory }
});

// 4. Save response to database
if (databaseNode && response) {
    await postgresExecutor({
        context: { ...updatedContext, _postgresOperation: 'save', _messageToSave: response }
    });
}
```

#### 5.2.3 Chat Model Nodes with Conversation History

Chat model nodes (`src/features/executions/components/chat-models/`) support conversation-aware interactions:

**OpenAI Chat Model** (`src/features/executions/components/chat-models/openai-chat-model/executor.ts`):
- Accepts chat history from AI Agent
- Formats messages as CoreMessage[] array
- Maintains system, assistant, and user message roles
- Returns generated text with conversation context

**Features:**
- Handlebars templating for dynamic prompts
- Context-aware message formatting
- Integration with AI Agent for persistent conversations

#### 5.2.4 AI Workflow Execution Flow

**File: `src/inngest/functions.ts`**

Workflow execution follows this pattern:
1. **Topological Sort**: Nodes are sorted based on dependencies
2. **AI Agent Orchestration**: AI Agent nodes manage their child nodes (models, databases)
3. **Sequential Execution**: Nodes execute in dependency order
4. **Context Passing**: Each node receives and enriches workflow context
5. **Error Handling**: Failures are captured and execution status updated

```typescript
// AI Agent child nodes are skipped in main loop
const AI_AGENT_CHILD_TYPES: NodeType[] = [
    NodeType.OPENAI_CHAT_MODEL,
    NodeType.ANTHROPIC_CHAT_MODEL,
    NodeType.GEMINI_CHAT_MODEL,
    NodeType.OPENROUTER_CHAT_MODEL,
    NodeType.POSTGRES,
    NodeType.MONGODB,
];

// AI Agent orchestrates these nodes internally
for (const node of sortedNodes) {
    if (nodesToSkip.includes(node.id)) continue; // Skip AI Agent children
    const executor = getExecutor(node.type);
    context = await executor({ data, nodeId, userId, context, step, publish });
}
```

### 5.3 IoT Application Design and Implementation

#### 5.3.1 IoT Integration Architecture

The platform enables IoT integration through multiple mechanisms:

**1. Webhook Triggers for IoT Data Reception**

**File: `src/app/api/webhooks/webhook-trigger/route.ts`**

IoT devices can send sensor data to webhook endpoints:
```typescript
// Webhook endpoint receives IoT data
export async function POST(req: NextRequest) {
    const workflowId = url.searchParams.get("workflowId");
    const body = await req.json(); // IoT sensor data
    
    // Rate limiting for IoT endpoints
    const ratelimit = new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(10, "1 m"),
    });
    
    // Trigger workflow with IoT data
    await sendWorkflowExecution({
        workflowId,
        initialData: { webhook: { raw: body } }
    });
}
```

**Features:**
- Unique webhook URL per workflow: `/api/webhooks/webhook-trigger?workflowId={id}`
- Rate limiting using Upstash Redis (10 requests per minute)
- JSON payload validation
- Automatic workflow triggering on IoT data reception

**2. HTTP Request Nodes for IoT Device Control**

**File: `src/features/executions/components/http-request/executor.ts`**

Workflows can send commands to IoT devices:
- GET/POST/PUT/DELETE requests to IoT device APIs
- Custom headers and authentication
- Response parsing and context enrichment
- Error handling for device communication failures

**3. Scheduled Triggers for Periodic IoT Data Collection**

**File: `src/inngest/scheduled-workflow-runner.ts`**

Cron-based triggers for periodic IoT data collection:
- Cron expression parsing
- Scheduled workflow execution
- Periodic sensor data polling
- Timezone-aware scheduling

#### 5.3.2 IoT Data Processing Workflow

**Example IoT Workflow:**
```
IoT Sensor → Webhook Trigger → AI Analysis → Database Storage → Notification
```

**Implementation:**
1. **IoT Device** sends sensor data to webhook endpoint
2. **Webhook Trigger Node** receives data and starts workflow
3. **AI Node** (OpenAI/Gemini) analyzes sensor readings
4. **PostgreSQL Node** stores analyzed data
5. **Discord/Slack Node** sends alerts if thresholds exceeded

**File: `src/app/api/webhooks/google-form/route.ts`** (Example IoT-like integration)
```typescript
// Receives form data (similar to IoT sensor data)
const formData = {
    formId: body.formId,
    formTitle: body.formTitle,
    responseId: body.responseId,
    timestamp: body.timestamp,
    responses: body.responses,
    raw: body,
};

await sendWorkflowExecution({
    workflowId,
    initialData: { googleForm: formData }
});
```

#### 5.3.3 IoT Use Cases Enabled

1. **Smart Home Automation**
   - Temperature sensors trigger HVAC control
   - Motion sensors activate security workflows
   - Smart device status monitoring

2. **Industrial IoT (IIoT)**
   - Machine sensor data analysis with AI
   - Predictive maintenance workflows
   - Production line monitoring

3. **Environmental Monitoring**
   - Air quality sensors trigger alerts
   - Weather data processing and notifications
   - Agricultural sensor data analysis

4. **Healthcare IoT**
   - Medical device data processing
   - Patient monitoring workflows
   - Health metric analysis with AI

### 5.4 Cloud Environment Implementation

#### 5.4.1 Serverless Workflow Execution

**Inngest Integration** (`src/inngest/client.ts`):
```typescript
export const inngest = new Inngest({ 
    id: "nodebase",
    middleware: [realtimeMiddleware()],
});
```

**Features:**
- Serverless function execution
- Automatic scaling based on workload
- Built-in retry mechanisms
- Real-time status updates via channels

**Workflow Execution Function** (`src/inngest/functions.ts`):
- Event-driven architecture
- Step-by-step execution with memoization
- Error handling and failure recovery
- Execution status tracking

#### 5.4.2 Database Architecture

**PostgreSQL Schema** (`prisma/schema.prisma`):

**Core Models:**
- `User`: Authentication and user management
- `Workflow`: Workflow definitions with nodes and connections
- `Node`: Individual workflow components (AI, IoT, actions)
- `Connection`: Node relationships and data flow
- `Execution`: Workflow execution history and results
- `Credential`: Encrypted API credentials

**Key Relationships:**
```
User → Workflows → Nodes → Connections
User → Credentials → Nodes
Workflow → Executions
```

**Database Features:**
- Encrypted credential storage
- Execution history tracking
- Workflow versioning support
- Efficient querying with Prisma ORM

#### 5.4.3 Rate Limiting and Caching

**Upstash Redis Integration** (`src/app/api/webhooks/webhook-trigger/route.ts`):
```typescript
const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
});
```

**Use Cases:**
- Webhook endpoint rate limiting
- API call throttling
- Caching frequently accessed data
- Distributed rate limiting across instances

#### 5.4.4 Monitoring and Error Tracking

**Sentry Integration** (`next.config.ts`, `sentry.server.config.ts`):
- Automatic error tracking
- Performance monitoring
- Source map uploads for debugging
- Vercel Cron Monitor integration

**Real-time Status Updates** (`src/inngest/channels/`):
- Node-level execution status
- Workflow progress tracking
- Error notifications
- Success confirmations

#### 5.4.5 Deployment Architecture

**Vercel Deployment:**
- Next.js serverless functions
- Edge network for global performance
- Automatic HTTPS and CDN
- Environment variable management

**Inngest Cloud:**
- Managed serverless execution
- Global function deployment
- Built-in observability
- Automatic scaling

**Database:**
- PostgreSQL (managed service compatible)
- Connection pooling
- SSL/TLS encryption
- Backup and recovery

### 5.5 Integration Points: AI + IoT

#### 5.5.1 AI-Powered IoT Data Analysis

**Workflow Pattern:**
```
IoT Sensor → Webhook → AI Analysis → Decision → Action
```

**Example Implementation:**
1. IoT temperature sensor sends data via webhook
2. OpenAI node analyzes: "Temperature is 35°C, above threshold"
3. PostgreSQL node stores analysis result
4. HTTP Request node sends command to IoT actuator (AC unit)
5. Slack node notifies user of action taken

#### 5.5.2 Conversational IoT Control

**AI Agent + IoT Integration:**
- User sends natural language command via Telegram
- AI Agent processes command with context
- Workflow determines IoT device to control
- HTTP Request node sends command to device
- AI Agent confirms action in natural language

#### 5.5.3 Predictive IoT Maintenance

**AI + Database + IoT:**
- Scheduled trigger collects IoT sensor data periodically
- AI Agent analyzes historical data patterns
- PostgreSQL stores predictions
- Alert sent if maintenance needed
- Workflow triggers maintenance request

### 5.6 Security and Credential Management

**File: `src/lib/encryption.ts`**

**Credential Encryption:**
- All API keys encrypted at rest
- User-specific credential isolation
- Secure credential retrieval per workflow execution
- Support for multiple credential types per user

**Credential Types Supported:**
- OpenAI API keys
- Anthropic API keys
- Google Gemini API keys
- OpenRouter API keys
- PostgreSQL connection strings
- MongoDB connection strings

### 5.7 Real-time Execution Monitoring

**Inngest Realtime Channels** (`src/inngest/channels/`):

Each node type has a dedicated channel for status updates:
- `openaiChannel()`: OpenAI node status
- `aiAgentChannel()`: AI Agent orchestration status
- `postgresChannel()`: Database operation status
- `webhookTriggerChannel()`: IoT data reception status

**Frontend Integration:**
- Real-time status updates via WebSocket
- Visual node status indicators
- Execution progress tracking
- Error display and debugging

## 6. Key Files and Implementation Details

### 6.1 AI Implementation Files

- `src/features/executions/components/ai-agent/executor.ts`: AI Agent orchestration
- `src/features/executions/components/openai/executor.ts`: OpenAI integration
- `src/features/executions/components/anthropic/executor.ts`: Anthropic integration
- `src/features/executions/components/gemini/executor.ts`: Gemini integration
- `src/features/executions/components/openrouter/executor.ts`: OpenRouter integration
- `src/features/executions/components/chat-models/`: Chat model implementations
- `src/features/executions/components/database/postgres/executor.ts`: PostgreSQL chat history
- `src/features/executions/components/database/mongodb/executor.ts`: MongoDB chat history

### 6.2 IoT Implementation Files

- `src/app/api/webhooks/webhook-trigger/route.ts`: IoT webhook endpoint
- `src/app/api/webhooks/google-form/route.ts`: Form data webhook (IoT-like)
- `src/app/api/webhooks/stripe/route.ts`: Payment webhook (event-driven)
- `src/features/triggers/components/webhook-trigger/`: Webhook trigger UI
- `src/features/executions/components/http-request/executor.ts`: IoT device control

### 6.3 Cloud Infrastructure Files

- `src/inngest/functions.ts`: Main workflow execution function
- `src/inngest/client.ts`: Inngest client configuration
- `src/inngest/channels/`: Real-time status update channels
- `src/inngest/scheduled-workflow-runner.ts`: Scheduled trigger execution
- `prisma/schema.prisma`: Database schema
- `next.config.ts`: Next.js and Sentry configuration

### 6.4 Workflow Execution Flow

**File: `src/inngest/functions.ts`** - Main execution logic:
1. Create execution record
2. Load workflow with nodes and connections
3. Topologically sort nodes
4. Identify AI Agent child nodes to skip
5. Execute nodes sequentially
6. Update execution status
7. Return results

## 7. Conclusion

Nodebase provides a comprehensive platform for designing, executing, and monitoring AI and IoT-powered workflows in a cloud environment. The platform successfully integrates:

- **Multiple AI Providers**: Unified interface for OpenAI, Anthropic, Gemini, and OpenRouter
- **AI Agent Orchestration**: Intelligent agents managing conversations with persistent storage
- **IoT Integration**: Webhook-based data reception and HTTP-based device control
- **Cloud-Native Architecture**: Serverless execution, auto-scaling, and distributed processing
- **Real-time Monitoring**: Live status updates and comprehensive error tracking

The platform enables developers and businesses to create sophisticated automation workflows that combine the power of AI with IoT device data, all through an intuitive visual interface, without requiring extensive programming knowledge.

