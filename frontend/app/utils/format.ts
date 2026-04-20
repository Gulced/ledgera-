import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export function formatMoney(
  value: number,
  currency: 'EUR' | 'USD' | 'TRY' | 'GBP',
) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value?: string) {
  if (!value) {
    return '-';
  }

  return format(new Date(value), 'd MMM yyyy, HH:mm', { locale: tr });
}

export function titleCaseStage(stage: string) {
  return stage.replaceAll('_', ' ');
}
