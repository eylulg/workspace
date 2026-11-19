'use client';

import { Button } from '@eylulg/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from '@eylulg/ui/dropdown-menu';
import { ChevronsUpDown, Globe } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import type { Key } from 'react-aria-components';
import { LOCALE_NAMES, localeName } from '@/i18n/locale-names';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales } from '@/i18n/routing';

export function LanguageSwitcher() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function handleAction(key: Key) {
    const next = locales.find((item) => item === key);
    if (!next || next === locale) return;
    startTransition(() => router.replace(`${pathname}${window.location.search}`, { locale: next }));
  }

  return (
    <DropdownMenu>
      <Button
        variant='secondary'
        size='sm'
        iconLeading={Globe}
        iconTrailing={ChevronsUpDown}
        aria-label={`${t('language')}: ${localeName(locale)}`}
        aria-busy={isPending}
        className='w-full justify-start'
      >
        {localeName(locale)}
      </Button>
      <DropdownMenuContent
        aria-label={t('language')}
        placement='top start'
        selectionMode='single'
        selectedKeys={[locale]}
        onAction={handleAction}
      >
        {locales.map((item) => (
          <DropdownMenuItem key={item} id={item} textValue={LOCALE_NAMES[item]}>
            <span lang={item}>{LOCALE_NAMES[item]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
