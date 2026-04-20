import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppBadRequestException } from './errors/app-error';

@Injectable()
export class GeminiEmailValidationService {
  constructor(private readonly configService: ConfigService) {}

  async assertValidEmail(email: string, fieldLabel = 'email') {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new AppBadRequestException(
        'INVALID_EMAIL_ADDRESS',
        `A valid ${fieldLabel} is required.`,
      );
    }

    const validation = await this.validateEmailWithGemini(normalizedEmail);

    if (!validation.isValid) {
      throw new AppBadRequestException(
        'INVALID_EMAIL_ADDRESS',
        validation.reason ?? `Please provide a valid ${fieldLabel} address.`,
      );
    }
  }

  private async validateEmailWithGemini(email: string): Promise<{ isValid: boolean; reason?: string }> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    const model = this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';

    if (!apiKey) {
      return this.buildFallbackDecision(email);
    }

    try {
      const response = await Promise.race([
        fetch(
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
                        'Decide if the following string is a valid email address for application signup/login.',
                        'Respond in JSON only with this exact shape:',
                        '{"isValid": true|false, "reason": "short explanation"}',
                        'Rules:',
                        '- Require a real email-like structure, not free text.',
                        '- The value must include @.',
                        '- Reject obvious non-email strings.',
                        '- Keep the reason under 18 words.',
                        `Value: ${email}`,
                      ].join('\n'),
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0,
                topP: 0.1,
                responseMimeType: 'application/json',
              },
            }),
          },
        ),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Gemini email validation timed out.')), 8000);
        }),
      ]);

      if (!response.ok) {
        return this.buildFallbackDecision(email);
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim();

      if (!text) {
        return this.buildFallbackDecision(email);
      }

      const parsed = JSON.parse(text) as { isValid?: boolean; reason?: string };

      if (typeof parsed.isValid !== 'boolean') {
        return this.buildFallbackDecision(email);
      }

      return {
        isValid: parsed.isValid,
        reason: parsed.reason?.trim() || undefined,
      };
    } catch {
      return this.buildFallbackDecision(email);
    }
  }

  private buildFallbackDecision(email: string) {
    const hasAt = email.includes('@');
    const hasNoSpaces = !email.includes(' ');
    const [localPart, domainPart] = email.split('@');
    const hasDomainDot = Boolean(domainPart?.includes('.'));
    const hasLocalPart = Boolean(localPart);
    const hasDomainPart = Boolean(domainPart);

    const isValid = hasAt && hasNoSpaces && hasLocalPart && hasDomainPart && hasDomainDot;

    return {
      isValid,
      reason: isValid ? undefined : 'Email must include @ and a valid domain.',
    };
  }
}
