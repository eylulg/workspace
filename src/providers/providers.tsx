'use client';

import { ToastProvider } from '@eylulg/ui/toast';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { I18nProvider } from 'react-aria-components';
import { AnalyticsInit } from '@/features/analytics/analytics-init';
import { RouteProvider } from './router-provider';

const TOAST_DURATION = 8000;

/** React Aria's own strings (such as the hidden dismiss button) and date formats follow the page locale. */
export function Providers({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const t = useTranslations('common');
  return (
    <I18nProvider locale={locale}>
      <RouteProvider>
        <ToastProvider label={t('notifications')} duration={TOAST_DURATION}>
          <AnalyticsInit />
          {children}
        </ToastProvider>
      </RouteProvider>
    </I18nProvider>
  );
}
