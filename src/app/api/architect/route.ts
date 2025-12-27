/**
 * API Route: /api/architect
 * Stage 1: Prompt Architect - Transforms user input into refined engineering prompt
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  PROMPT_ARCHITECT_SYSTEM,
  buildArchitectUserMessage,
  extractSuggestedName,
} from '@/lib/prompts';
import {
  checkRateLimit,
  getClientIP,
  createRateLimitHeaders,
  createRateLimitResponse,
  validateInputSize,
} from '@/lib/rate-limit';
import type { ArchitectRequest, ArchitectResponse, AIProvider } from '@/types';

// Maximum input size (50KB)
const MAX_INPUT_SIZE = 50000;

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIP = getClientIP(request);

    // Check rate limit
    const { allowed, info } = checkRateLimit(clientIP);
    if (!allowed) {
      return createRateLimitResponse(info);
    }

    // Parse request body
    const body: ArchitectRequest & { apiKey?: string; provider?: AIProvider } =
      await request.json();

    const { userDraft, advancedOptions, apiKey, provider } = body;

    // Validate input
    if (!userDraft || typeof userDraft !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid userDraft' },
        { status: 400 }
      );
    }

    if (!validateInputSize(userDraft, MAX_INPUT_SIZE)) {
      return NextResponse.json(
        { error: `Input too large. Maximum size is ${MAX_INPUT_SIZE} characters.` },
        { status: 400 }
      );
    }

    // Build the user message
    const userMessage = buildArchitectUserMessage(userDraft, advancedOptions);

    // Determine which provider to use
    const aiProvider = provider || advancedOptions?.aiProvider || 'openai';

    let outputPrompt: string;

    if (aiProvider === 'anthropic') {
      outputPrompt = await callAnthropic(userMessage, apiKey);
    } else if (aiProvider === 'gemini') {
      outputPrompt = await callGemini(userMessage, apiKey);
    } else {
      outputPrompt = await callOpenAI(userMessage, apiKey);
    }

    // Extract suggested name from the output
    const suggestedName =
      advancedOptions?.extensionName || extractSuggestedName(outputPrompt);

    const response: ArchitectResponse = {
      outputPrompt,
      suggestedName,
    };

    return NextResponse.json(response, {
      headers: createRateLimitHeaders(info),
    });
  } catch (error) {
    console.error('Architect API error:', error);

    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';

    // Check for specific API errors
    if (message.includes('API key')) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    if (message.includes('rate limit') || message.includes('quota')) {
      return NextResponse.json(
        { error: 'AI provider rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate prompt. Please try again.' },
      { status: 500 }
    );
  }
}

async function callOpenAI(userMessage: string, apiKey?: string): Promise<string> {
  const key = apiKey || process.env.OPENAI_API_KEY;

  if (!key) {
    throw new Error('OpenAI API key is required');
  }

  const openai = new OpenAI({ apiKey: key });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Fast and cost-effective for Stage 1
    messages: [
      { role: 'system', content: PROMPT_ARCHITECT_SYSTEM },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return content;
}

async function callAnthropic(userMessage: string, apiKey?: string): Promise<string> {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;

  if (!key) {
    throw new Error('Anthropic API key is required');
  }

  const anthropic = new Anthropic({ apiKey: key });

  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022', // Fast model for Stage 1
    max_tokens: 4000,
    system: PROMPT_ARCHITECT_SYSTEM,
    messages: [{ role: 'user', content: userMessage }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic');
  }

  return content.text;
}

async function callGemini(userMessage: string, apiKey?: string): Promise<string> {
  const key = apiKey || process.env.GEMINI_API_KEY;

  if (!key) {
    throw new Error('Gemini API key is required');
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: PROMPT_ARCHITECT_SYSTEM,
  });

  const result = await model.generateContent(userMessage);
  const response = result.response;
  const content = response.text();

  if (!content) {
    throw new Error('No response from Gemini');
  }

  return content;
}
