# OpenRouter Service Implementation Plan

## 1. Service Description

The `OpenRouterService` is a TypeScript service class that provides a clean interface for interacting with the OpenRouter API to generate AI-powered seating plan optimizations. This service handles:

- API authentication and configuration
- Message formatting for AI models
- Structured JSON response handling via JSON Schema
- Error handling and retry logic
- Response parsing and validation

**File Location**: `src/services/openrouter.service.ts`

**Dependencies**:
- OpenRouter API (https://openrouter.ai/api/v1)
- Environment variables (OPENROUTER_API_KEY)
- Native Fetch API for HTTP requests

**Key Design Principles**:
- Single Responsibility: Only handles OpenRouter API communication
- Type Safety: Full TypeScript typing for requests and responses
- Error Resilience: Comprehensive error handling with retries
- Security: Never exposes API keys in logs or errors

## 2. Constructor Description

### Signature
```typescript
constructor()
```

### Responsibilities
1. Load and validate `OPENROUTER_API_KEY` from environment variables
2. Initialize configuration (base URL, default model, parameters)
3. Throw descriptive error if API key is missing or invalid

### Implementation Details
```typescript
constructor() {
  this.apiKey = import.meta.env.OPENROUTER_API_KEY;

  if (!this.apiKey || this.apiKey === '###' || this.apiKey.trim() === '') {
    throw new Error('OpenRouter API key is not configured. Please set OPENROUTER_API_KEY in your .env file.');
  }

  this.baseUrl = 'https://openrouter.ai/api/v1';
  this.defaultModel = 'anthropic/claude-3.5-sonnet';
  this.defaultParams = {
    temperature: 0.2,
    max_tokens: 4000,
    top_p: 0.9
  };
}
```

### Validation Steps
1. Check if API key exists
2. Check if API key is placeholder value ('###')
3. Check if API key is empty or whitespace
4. Throw error with actionable message if validation fails

## 3. Public Methods and Fields

### 3.1 Method: `generateSeatingPlan(prompt: string): Promise<string>`

**Purpose**: Generate an optimized seating plan using AI based on the provided prompt.

**Parameters**:
- `prompt: string` - Detailed prompt containing guest data, table data, relationships, and optimization criteria

**Returns**:
- `Promise<string>` - Raw AI response containing JSON seating plan

**Implementation Steps**:
1. Create system message for context
2. Create user message with prompt
3. Define response format schema
4. Build request payload
5. Send POST request to OpenRouter
6. Handle errors and retries
7. Extract response content
8. Return raw response

**Example Usage**:
```typescript
const prompt = this.buildSeatingPrompt(guests, tables, relationships, request);
const aiResponse = await this.openRouter.generateSeatingPlan(prompt);
```

**Detailed Implementation**:
```typescript
async generateSeatingPlan(prompt: string): Promise<string> {
  const messages = [
    this.createSystemMessage(),
    this.createUserMessage(prompt)
  ];

  const requestBody = {
    model: this.defaultModel,
    messages,
    response_format: this.createSeatingPlanResponseFormat(),
    temperature: this.defaultParams.temperature,
    max_tokens: this.defaultParams.max_tokens,
    top_p: this.defaultParams.top_p
  };

  const response = await this.sendRequest(requestBody);
  return this.extractContent(response);
}
```

### 3.2 Method: `parseAIResponse(response: string): object`

**Purpose**: Parse and validate the AI response into a structured object.

**Parameters**:
- `response: string` - Raw AI response (may contain JSON with or without markdown)

**Returns**:
- `object` - Parsed and validated seating plan object

**Implementation Steps**:
1. Strip markdown code fences if present
2. Extract JSON from response text
3. Parse JSON string
4. Validate required fields exist
5. Return parsed object

**Error Handling**:
- If JSON parsing fails, throw descriptive error
- If validation fails, throw with original response for debugging
- Log parsing errors with sanitized data

**Detailed Implementation**:
```typescript
parseAIResponse(response: string): object {
  try {
    // Remove markdown code fences
    let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Try to extract JSON object if there's extra text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    const parsed = JSON.parse(cleaned);

    // Validate required fields
    if (!parsed.assignments || !Array.isArray(parsed.assignments)) {
      throw new Error('Invalid response: missing or invalid assignments array');
    }

    if (typeof parsed.overall_score !== 'number') {
      throw new Error('Invalid response: missing or invalid overall_score');
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse AI response:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      responsePreview: response.substring(0, 200) + '...'
    });
    throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

## 4. Private Methods and Fields

### 4.1 Field: `apiKey: string`
- Stores OpenRouter API key from environment
- Never logged or exposed in errors

### 4.2 Field: `baseUrl: string`
- OpenRouter API base URL
- Default: `'https://openrouter.ai/api/v1'`

### 4.3 Field: `defaultModel: string`
- Default AI model to use
- Recommended: `'anthropic/claude-3.5-sonnet'` (supports structured outputs, high quality)
- Alternatives:
  - `'openai/gpt-4-turbo'` (good balance)
  - `'meta-llama/llama-3.1-70b-instruct'` (cost-effective)

### 4.4 Field: `defaultParams: ModelParameters`
- Default model parameters
```typescript
interface ModelParameters {
  temperature: number;    // 0.0-1.0, lower = more deterministic
  max_tokens: number;     // Maximum response length
  top_p: number;          // 0.0-1.0, nucleus sampling
}
```

### 4.5 Method: `createSystemMessage(): Message`

**Purpose**: Create system message with AI instructions.

**Returns**: Message object with role 'system'

**Implementation**:
```typescript
private createSystemMessage(): Message {
  return {
    role: 'system',
    content: `You are an expert event planner specializing in optimal seating arrangements.
Your task is to analyze guest information, table configurations, and relationships to create
the best possible seating plan that maximizes guest compatibility and satisfaction.

CRITICAL INSTRUCTIONS:
1. You MUST respond with valid JSON only, no additional text or explanation
2. Follow the exact schema provided in response_format
3. Ensure all guest_id and table_id values match the provided data
4. Calculate compatibility_score as a number between 0-10
5. Calculate overall_score as the average of all compatibility scores
6. Include warnings array for any potential issues (empty array if none)

Your response will be parsed directly as JSON, so do not include markdown, comments, or any text outside the JSON object.`
  };
}
```

### 4.6 Method: `createUserMessage(prompt: string): Message`

**Purpose**: Create user message with the seating plan prompt.

**Parameters**:
- `prompt: string` - Formatted prompt from buildSeatingPrompt()

**Returns**: Message object with role 'user'

**Implementation**:
```typescript
private createUserMessage(prompt: string): Message {
  return {
    role: 'user',
    content: prompt
  };
}
```

### 4.7 Method: `createSeatingPlanResponseFormat(): ResponseFormat`

**Purpose**: Define JSON schema for structured seating plan responses.

**Returns**: ResponseFormat object with json_schema

**Implementation**:
```typescript
private createSeatingPlanResponseFormat(): ResponseFormat {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'seating_plan_response',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          assignments: {
            type: 'array',
            description: 'Array of guest-to-table assignments',
            items: {
              type: 'object',
              properties: {
                guest_id: {
                  type: 'number',
                  description: 'ID of the guest being assigned'
                },
                table_id: {
                  type: 'number',
                  description: 'ID of the table where guest is seated'
                },
                compatibility_score: {
                  type: 'number',
                  description: 'Compatibility score for this assignment (0-10)'
                }
              },
              required: ['guest_id', 'table_id', 'compatibility_score'],
              additionalProperties: false
            }
          },
          overall_score: {
            type: 'number',
            description: 'Overall optimization score for the entire plan (0-100)'
          },
          warnings: {
            type: 'array',
            description: 'Any warnings or notes about the seating plan',
            items: {
              type: 'string'
            }
          }
        },
        required: ['assignments', 'overall_score'],
        additionalProperties: false
      }
    }
  };
}
```

### 4.8 Method: `sendRequest(body: RequestBody): Promise<Response>`

**Purpose**: Send HTTP POST request to OpenRouter API with retry logic.

**Parameters**:
- `body: RequestBody` - Complete request payload

**Returns**: Promise<Response> - API response

**Implementation Steps**:
1. Build headers with API key and metadata
2. Send POST request to /chat/completions
3. Check response status
4. Handle errors with retry for transient failures
5. Return response

**Detailed Implementation**:
```typescript
private async sendRequest(body: RequestBody, retryCount = 0): Promise<any> {
  const maxRetries = 3;
  const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff

  try {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://easywedding.app', // Optional: your site URL
        'X-Title': 'EasyWedding Seating Planner' // Optional: your app name
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      await this.handleErrorResponse(response, retryCount, maxRetries);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    if (retryCount < maxRetries && this.isRetryableError(error)) {
      console.warn(`Request failed, retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
      await this.delay(retryDelay);
      return this.sendRequest(body, retryCount + 1);
    }
    throw error;
  }
}
```

### 4.9 Method: `handleErrorResponse(response: Response, retryCount: number, maxRetries: number): Promise<never>`

**Purpose**: Handle HTTP error responses with appropriate retry logic.

**Implementation**:
```typescript
private async handleErrorResponse(
  response: Response,
  retryCount: number,
  maxRetries: number
): Promise<never> {
  const errorBody = await response.text();

  switch (response.status) {
    case 401:
      throw new Error('Invalid OpenRouter API key. Please check your OPENROUTER_API_KEY configuration.');

    case 429:
      if (retryCount < maxRetries) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retryCount) * 1000;
        console.warn(`Rate limited, retrying after ${delay}ms...`);
        await this.delay(delay);
        throw new Error('RETRY'); // Signal to retry
      }
      throw new Error('Rate limit exceeded. Please try again later.');

    case 503:
      if (retryCount < maxRetries) {
        throw new Error('RETRY');
      }
      throw new Error('OpenRouter service temporarily unavailable. Please try again later.');

    case 400:
      throw new Error(`Invalid request to OpenRouter: ${errorBody}`);

    default:
      throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`);
  }
}
```

### 4.10 Method: `extractContent(response: any): string`

**Purpose**: Extract message content from OpenRouter API response.

**Implementation**:
```typescript
private extractContent(response: any): string {
  if (!response.choices || response.choices.length === 0) {
    throw new Error('No response choices returned from OpenRouter');
  }

  const message = response.choices[0].message;
  if (!message || !message.content) {
    throw new Error('No content in OpenRouter response');
  }

  return message.content;
}
```

### 4.11 Method: `isRetryableError(error: any): boolean`

**Purpose**: Determine if an error should trigger a retry.

**Implementation**:
```typescript
private isRetryableError(error: any): boolean {
  if (error.message === 'RETRY') return true;

  // Network errors
  if (error.name === 'NetworkError' || error.name === 'FetchError') return true;

  // Timeout errors
  if (error.message?.includes('timeout')) return true;

  return false;
}
```

### 4.12 Method: `delay(ms: number): Promise<void>`

**Purpose**: Helper for async delays in retry logic.

**Implementation**:
```typescript
private delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## 5. Error Handling

### 5.1 Error Categories

#### Configuration Errors
- **Cause**: Missing or invalid API key
- **When**: During constructor initialization
- **Handling**: Throw immediately with actionable message
- **User Impact**: Service unavailable, clear setup instructions needed

```typescript
// Example
if (!this.apiKey || this.apiKey === '###') {
  throw new Error('OpenRouter API key is not configured. Please set OPENROUTER_API_KEY in your .env file.');
}
```

#### Authentication Errors (401)
- **Cause**: Invalid API key
- **When**: During API request
- **Handling**: Do not retry, throw with clear message
- **User Impact**: Service unavailable, API key needs correction

```typescript
case 401:
  throw new Error('Invalid OpenRouter API key. Please check your OPENROUTER_API_KEY configuration.');
```

#### Rate Limit Errors (429)
- **Cause**: Too many requests
- **When**: During API request
- **Handling**: Retry with exponential backoff (up to 3 attempts)
- **User Impact**: Temporary delay, automatic recovery

```typescript
case 429:
  if (retryCount < maxRetries) {
    const retryAfter = response.headers.get('Retry-After');
    const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retryCount) * 1000;
    await this.delay(delay);
    return this.sendRequest(body, retryCount + 1);
  }
  throw new Error('Rate limit exceeded. Please try again later.');
```

#### Model Errors (400, 500, 503)
- **Cause**: Invalid request or model unavailable
- **When**: During API request
- **Handling**: 503 - retry, 400/500 - throw with details
- **User Impact**: May need user to adjust input or wait

```typescript
case 503:
  if (retryCount < maxRetries) {
    await this.delay(Math.pow(2, retryCount) * 1000);
    return this.sendRequest(body, retryCount + 1);
  }
  throw new Error('OpenRouter service temporarily unavailable.');
```

#### Parsing Errors
- **Cause**: Invalid JSON in response
- **When**: During response parsing
- **Handling**: Try fallback extraction, log original response, throw if all fail
- **User Impact**: Failed request, need to retry or report issue

```typescript
catch (error) {
  console.error('Failed to parse AI response:', {
    error: error instanceof Error ? error.message : 'Unknown error',
    responsePreview: response.substring(0, 200) + '...'
  });
  throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
}
```

### 5.2 Error Logging Strategy

**What to Log**:
- Error type and message
- Request ID (if available)
- HTTP status code
- Retry attempt number
- Sanitized request details (no API key)

**What NOT to Log**:
- API keys
- Full guest data (PII concerns)
- Complete error stack in production

**Example Logging**:
```typescript
console.error('OpenRouter API Error', {
  error_type: 'RateLimitError',
  status_code: 429,
  retry_attempt: retryCount,
  message: 'Rate limit exceeded',
  // Never log: this.apiKey, full request body with guest data
});
```

## 6. Security Considerations

### 6.1 API Key Protection
- **Storage**: Only in environment variables, never in code
- **Access**: Private field, never exposed in methods or errors
- **Logging**: Never log API key, use masked version `sk-or-v1-***...***` if needed
- **Transmission**: Always use HTTPS, never HTTP

### 6.2 Data Privacy
- **Guest Data**: Minimize data sent to OpenRouter, only what's needed for optimization
- **Logging**: Sanitize logs to remove PII (names, emails, etc.)
- **Error Messages**: Don't include sensitive data in error messages returned to frontend

### 6.3 Rate Limiting
- **Client-Side**: Implement request throttling to prevent abuse
- **Cost Control**: Set max_tokens to reasonable limit (4000)
- **Monitoring**: Track API usage and costs

### 6.4 Input Validation
- **Prompt Length**: Check prompt doesn't exceed model context window
- **Sanitization**: Escape special characters that might break JSON
- **Schema Validation**: Use strict: true in json_schema to enforce exact schema

### 6.5 Error Message Sanitization
```typescript
// Good - Safe error message
throw new Error('API key is not configured');

// Bad - Exposes sensitive data
throw new Error(`API key ${this.apiKey} is invalid`);
```

## 7. Step-by-Step Implementation Plan

### Step 1: Create Type Definitions
**File**: `src/services/openrouter.service.ts` (top of file)

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ModelParameters {
  temperature: number;
  max_tokens: number;
  top_p: number;
}

interface ResponseFormat {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: boolean;
    schema: object;
  };
}

interface RequestBody {
  model: string;
  messages: Message[];
  response_format: ResponseFormat;
  temperature: number;
  max_tokens: number;
  top_p: number;
}
```

### Step 2: Implement Class Structure
```typescript
export class OpenRouterService {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;
  private defaultParams: ModelParameters;

  constructor() {
    // Implementation from section 2
  }

  // Public methods (section 3)
  async generateSeatingPlan(prompt: string): Promise<string> { }
  parseAIResponse(response: string): object { }

  // Private methods (section 4)
  private createSystemMessage(): Message { }
  private createUserMessage(prompt: string): Message { }
  private createSeatingPlanResponseFormat(): ResponseFormat { }
  private async sendRequest(body: RequestBody, retryCount = 0): Promise<any> { }
  private async handleErrorResponse(response: Response, retryCount: number, maxRetries: number): Promise<never> { }
  private extractContent(response: any): string { }
  private isRetryableError(error: any): boolean { }
  private delay(ms: number): Promise<void> { }
}
```

### Step 3: Implement Constructor
- Load API key from `import.meta.env.OPENROUTER_API_KEY`
- Validate API key is present and not placeholder
- Initialize configuration values
- Throw descriptive error if validation fails

### Step 4: Implement Message Creation Methods
- `createSystemMessage()`: Return system message with detailed instructions
- `createUserMessage()`: Return user message with provided prompt
- Ensure system message emphasizes JSON-only output

### Step 5: Implement Response Format Method
- Define complete JSON schema for seating plan
- Use strict: true for exact schema enforcement
- Include all required fields: assignments, overall_score, warnings
- Match schema to TypeScript types in types.ts

### Step 6: Implement HTTP Request Method
- Create headers with Authorization, Content-Type, HTTP-Referer, X-Title
- Use fetch API to POST to /chat/completions
- Implement retry logic with exponential backoff
- Handle all error status codes appropriately
- Return parsed response

### Step 7: Implement Response Extraction and Parsing
- `extractContent()`: Extract message.content from API response
- `parseAIResponse()`: Parse JSON, handle markdown, validate structure
- Implement fallback extraction for non-standard responses
- Throw descriptive errors with debugging info

### Step 8: Implement Error Handling
- Create error handling for each status code
- Implement retry logic for transient errors (429, 503, network)
- Add logging with sanitized data
- Map technical errors to user-friendly messages

### Step 9: Add Security Measures
- Audit code for API key exposure
- Implement input validation
- Sanitize error messages
- Add rate limiting logic

### Step 10: Testing Checklist
- [ ] Test with missing API key
- [ ] Test with invalid API key (401)
- [ ] Test successful request with valid data
- [ ] Test with malformed JSON in response
- [ ] Test retry logic by simulating 429/503
- [ ] Test with prompt exceeding token limit
- [ ] Verify no API key in logs or errors
- [ ] Test parseAIResponse with various JSON formats
- [ ] Verify response matches TypeScript types
- [ ] Test error messages are user-friendly

### Step 11: Integration with SeatingPlanService
```typescript
// In seating-plan.service.ts
const aiResponse = await this.openRouter.generateSeatingPlan(prompt);
const parsedResponse = this.openRouter.parseAIResponse(aiResponse) as {
  assignments: { guest_id: number; table_id: number; compatibility_score: number }[];
  overall_score: number;
  warnings?: string[];
};
```

### Step 12: Documentation
- Add JSDoc comments to all public methods
- Document recommended models and their tradeoffs
- Add usage examples in comments
- Document error codes and handling

### Step 13: Environment Configuration
Update `.env.example`:
```env
# OpenRouter API Configuration
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Recommended models:
# anthropic/claude-3.5-sonnet (best quality, supports structured outputs)
# openai/gpt-4-turbo (good balance)
# meta-llama/llama-3.1-70b-instruct (cost-effective)
```

### Step 14: Final Review
- Code review focusing on security
- Performance review (check for unnecessary API calls)
- Error handling completeness
- Type safety verification
- Documentation completeness

## 8. Advanced Features (Future Enhancements)

### 8.1 Streaming Responses
- Implement SSE (Server-Sent Events) for real-time updates
- Stream tokens as they're generated
- Update UI progressively

### 8.2 Caching
- Cache identical prompts to reduce costs
- Implement TTL for cached responses
- Consider Redis for distributed caching

### 8.3 Model Selection
- Allow per-request model override
- Implement model fallback (try premium, fall back to standard)
- Add model capability detection

### 8.4 Usage Tracking
- Track API calls per user
- Monitor costs
- Implement usage quotas

### 8.5 A/B Testing
- Test different models
- Compare prompts
- Measure optimization quality

## 9. Configuration Reference

### Environment Variables
```bash
# Required
OPENROUTER_API_KEY=sk-or-v1-...

# Optional (with defaults shown)
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_TEMPERATURE=0.2
OPENROUTER_MAX_TOKENS=4000
OPENROUTER_TOP_P=0.9
```

### Model Selection Guide

| Model | Cost | Quality | Speed | Structured Output | Best For |
|-------|------|---------|-------|-------------------|----------|
| anthropic/claude-3.5-sonnet | $$$ | Excellent | Fast | ✅ Yes | Production, complex seating |
| openai/gpt-4-turbo | $$ | Very Good | Medium | ✅ Yes | Balanced cost/quality |
| openai/gpt-3.5-turbo | $ | Good | Very Fast | ✅ Yes | Development, simple seating |
| meta-llama/llama-3.1-70b-instruct | $ | Good | Fast | ✅ Yes | Cost-conscious production |

### Parameter Tuning Guide

**Temperature**:
- `0.0 - 0.3`: Deterministic, consistent results (recommended for seating)
- `0.4 - 0.7`: Balanced creativity and consistency
- `0.8 - 1.0`: Creative, varied results (not recommended)

**Max Tokens**:
- Minimum: 1000 (small events)
- Recommended: 4000 (medium events)
- Maximum: 8000 (large events)

**Top P**:
- `0.9`: Recommended default
- `0.95`: Slightly more variation
- `0.8`: More focused, deterministic

## 10. Troubleshooting Guide

### Issue: "API key is not configured"
**Cause**: OPENROUTER_API_KEY not set in environment
**Solution**:
1. Copy `.env.example` to `.env`
2. Add your OpenRouter API key
3. Restart dev server

### Issue: "Rate limit exceeded"
**Cause**: Too many requests in short time
**Solution**:
1. Service auto-retries with backoff
2. If persistent, wait 60 seconds
3. Consider implementing request throttling

### Issue: "Failed to parse AI response"
**Cause**: Model returned invalid JSON
**Solution**:
1. Check logs for response preview
2. Verify model supports json_schema
3. Try different model
4. Check prompt isn't too complex

### Issue: High API costs
**Cause**: Expensive model or large prompts
**Solution**:
1. Use cheaper model (gpt-3.5-turbo, llama-3.1)
2. Reduce max_tokens
3. Implement caching
4. Batch similar requests

### Issue: Poor seating quality
**Cause**: Insufficient context or wrong parameters
**Solution**:
1. Improve prompt with more detail
2. Increase temperature slightly (0.3-0.4)
3. Try premium model (Claude 3.5 Sonnet)
4. Add more relationship data
