import { PageHeader } from '@eylulg/ui/page-header';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('notFound');
  return (
    <PageHeader
      headingLevel={1}
      title={t('title')}
      description={t('body')}
      actions={
        <Link
          href='/issues'
          className='rounded-sm text-sm font-semibold text-brand outline-focus hover:underline focus-visible:outline-2'
        >
          {t('back')}
        </Link>
      }
    />
  );
}
