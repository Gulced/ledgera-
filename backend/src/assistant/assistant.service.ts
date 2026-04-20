import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppBadRequestException } from '../common/errors/app-error';
import type { ActorContextDto } from '../transactions/dto/transaction.dto';
import type { AssistantPageType, AssistantResponseDto } from './dto/assistant.dto';

@Injectable()
export class AssistantService {
  constructor(private readonly configService: ConfigService) {}

  async chat(input: {
    actor: ActorContextDto;
    pageType: AssistantPageType;
    prompt: string;
    title?: string;
    context: Record<string, unknown>;
  }): Promise<AssistantResponseDto> {
    const { actor, pageType, prompt, title, context } = input;
    let response: string;
    let source: 'gemini' | 'fallback' = 'gemini';

    try {
      response = await this.generateGeminiResponse({ pageType, prompt, title, context });
    } catch {
      source = 'fallback';
      response = this.buildFallbackResponse({ actor, pageType, prompt, title, context });
    }

    return {
      pageType,
      prompt,
      response,
      source,
      requestedBy: actor,
    };
  }

  private async generateGeminiResponse(input: {
    pageType: AssistantPageType;
    prompt: string;
    title?: string;
    context: Record<string, unknown>;
  }) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    const model = this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';

    if (!apiKey) {
      throw new AppBadRequestException(
        'MISSING_GEMINI_API_KEY',
        'GEMINI_API_KEY is not configured on the backend.',
      );
    }

    const contextJson = JSON.stringify(input.context, null, 2);
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
                      'You are a concise, practical real-estate operations copilot inside Ledgera.',
                      `Current page type: ${input.pageType}`,
                      `Page title: ${input.title ?? 'Untitled context'}`,
                      `User prompt: ${input.prompt}`,
                      '',
                      'Context JSON:',
                      contextJson,
                      '',
                      'Instructions:',
                      '- Answer using only the provided page context.',
                      '- Be practical and operational, not academic.',
                      '- Prefer short sections or bullets when helpful.',
                      '- If the user asks for a message draft, write a polished ready-to-use draft.',
                      '- If there is not enough context, say what is missing briefly.',
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
      ),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Gemini request timed out.'));
        }, 15000);
      }),
    ]);

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

  private buildFallbackResponse(input: {
    actor: ActorContextDto;
    pageType: AssistantPageType;
    prompt: string;
    title?: string;
    context: Record<string, unknown>;
  }) {
    const heading = input.title ?? 'Current page';
    const role = input.actor.role;

    switch (input.pageType) {
      case 'listing_detail': {
        const listing = input.context.listing as
          | {
              title?: string;
              city?: string;
              fullAddress?: string;
              status?: string;
              askingPrice?: number;
              currency?: string;
              listingAgent?: { name?: string };
            }
          | undefined;

        return [
          `${listing?.title ?? heading} icin hizli degerlendirme:`,
          `Kayit ${listing?.city ?? 'belirsiz bir lokasyonda'} ve su an ${listing?.status ?? 'active'} durumunda gorunuyor.`,
          role === 'agent'
            ? `Bugun icin en mantikli adim, ${listing?.listingAgent?.name ?? 'atanmis agent'} adina kisa bir musteri takibi yapmak ve adres/fiyat bilgisini net kullanarak iletisim hazirlamak.`
            : `Bugun icin en mantikli adim, kaydin sahipligini ve takip planini netlestirip adres/fiyat bilgisinin operasyonel olarak tam oldugunu kontrol etmek.`,
          `Kayitli adres: ${listing?.fullAddress ?? 'adres bilgisi eksik'}.`,
          `Soru: ${input.prompt}`,
        ].join('\n\n');
      }
      case 'transaction_detail': {
        const transaction = input.context.transaction as
          | {
              propertyRef?: string;
              stage?: string;
              listingAgent?: { name?: string };
              sellingAgent?: { name?: string };
            }
          | undefined;

        return [
          `${transaction?.propertyRef ?? heading} icin hizli islem ozeti:`,
          `Mevcut asama: ${transaction?.stage ?? 'bilinmiyor'}.`,
          role === 'finance'
            ? 'Finans tarafinda siradaki kontrol, kapanis oncesi tutar, komisyon ve kilitlenme kosullarinin net oldugunu dogrulamak olmali.'
            : 'Siradaki mantikli adim, bir sonraki asama icin gereken belge veya onayi netlestirmek ve ilgili taraflarla takip planini esitlemek olmali.',
          `Soru: ${input.prompt}`,
        ].join('\n\n');
      }
      case 'listings': {
        const total = input.context.totalVisibleListings as number | undefined;
        const visibleListings = input.context.visibleListings as Array<{ title?: string; status?: string }> | undefined;
        const underOfferCount = visibleListings?.filter((item) => item.status === 'under_offer').length ?? 0;
        return [
          `Listings workspace icin hizli ozet:`,
          `Su an gorunen ilan sayisi: ${total ?? 0}. Under-offer olanlar: ${underOfferCount}.`,
          role === 'agent'
            ? 'Onceligi bugun geri donus bekleyen veya hareket gerektiren ilanlara verip kisa bir takip listesi cikarmak en dogru adim olur.'
            : role === 'finance'
              ? 'Finans tarafinda oncelik, ileride isleme donusme ihtimali yuksek ilanlari ve durum degisikligi bekleyen kayitlari izlemek olmali.'
              : 'Operasyonel olarak under-offer, kapatma asamasina yakin veya hareket bekleyen ilanlari oncelemek en mantikli odak alani olur.',
          `Soru: ${input.prompt}`,
        ].join('\n\n');
      }
      default:
        {
          const dashboardSummary = input.context.summary as
            | {
                totals?: {
                  transactions?: number;
                  completedTransactions?: number;
                };
              }
            | undefined;
          const transactionsCount = dashboardSummary?.totals?.transactions ?? 0;
          const completedCount = dashboardSummary?.totals?.completedTransactions ?? 0;

        return [
          `${heading} icin hizli dashboard yorumu:`,
          `Toplam islem: ${transactionsCount}. Tamamlanan islem: ${completedCount}.`,
          role === 'admin'
            ? 'Bugun admin odagi icin en dogru alan, sikisan islemler, sahipligi net olmayan kayitlar ve ekipte hizli karar gerektiren konular olur.'
            : role === 'operations'
              ? 'Bugun operasyon odagi icin en dogru alan, asama ilerlemesi yavaslayan islemler ve hemen takip gerektiren listing/transaction kayitlari olur.'
              : role === 'finance'
                ? 'Bugun finans odagi icin en dogru alan, kapanisa yakin islemler, komisyon etkisi yuksek kayitlar ve raporlama acisindan onemli degisiklikler olur.'
                : 'Bugun agent odagi icin en dogru alan, hareket bekleyen listingler ve musteri geri donusu gerektiren islemler olur.',
          `Soru: ${input.prompt}`,
        ].join('\n\n');
        }
    }
  }
}
