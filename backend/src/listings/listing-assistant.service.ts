import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppBadRequestException } from '../common/errors/app-error';
import type { ActorContextDto } from '../transactions/dto/transaction.dto';
import type { ListingDto } from './dto/listing.dto';
import type {
  ListingAssistantAction,
  ListingAssistantResponseDto,
} from './dto/listing-assistant.dto';

@Injectable()
export class ListingAssistantService {
  constructor(private readonly configService: ConfigService) {}

  async createResponse(input: {
    listing: ListingDto;
    actor: ActorContextDto;
    action: ListingAssistantAction;
    prompt: string;
  }): Promise<ListingAssistantResponseDto> {
    const { listing, actor, action, prompt } = input;
    const response = await this.generateGeminiResponse(listing, action, prompt);

    return {
      listingId: listing.id,
      action,
      prompt,
      requestedBy: actor,
      response,
    };
  }

  private async generateGeminiResponse(
    listing: ListingDto,
    action: ListingAssistantAction,
    prompt: string,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    const model = this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';

    if (!apiKey) {
      throw new AppBadRequestException(
        'MISSING_GEMINI_API_KEY',
        'GEMINI_API_KEY is not configured on the backend.',
      );
    }

    const price = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: listing.currency,
      maximumFractionDigits: 0,
    }).format(listing.askingPrice);

    const statusLabel = listing.status.replaceAll('_', ' ');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: [
                    'You are a concise real-estate listing operations copilot inside Ledgera.',
                    `Action: ${action}`,
                    `User prompt: ${prompt}`,
                    `Listing title: ${listing.title}`,
                    `Property ref: ${listing.propertyRef}`,
                    `City: ${listing.city}`,
                    `Full address: ${listing.fullAddress}`,
                    `Status: ${statusLabel}`,
                    `Asking price: ${price}`,
                    `Listing agent: ${listing.listingAgent.name}`,
                    '',
                    'Instructions:',
                    '- Use the listing context above.',
                    '- Be practical, operational, and concise.',
                    '- If the action is client_message, write a polished client-facing draft.',
                    '- If the action is follow_up_tasks, return a flat actionable checklist.',
                    '- Do not mention being an AI model.',
                  ].join('\n'),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.6,
            topP: 0.9,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new AppBadRequestException(
        'GEMINI_REQUEST_FAILED',
        `Gemini request failed: ${errorText}`,
      );
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('\n').trim();

    if (!text) {
      throw new AppBadRequestException(
        'GEMINI_EMPTY_RESPONSE',
        'Gemini returned an empty response.',
      );
    }

    return text;
  }
}
