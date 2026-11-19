'use client';

import { Button } from '@eylulg/ui/button';
import { SegmentedControl, SegmentedControlItem } from '@eylulg/ui/segmented-control';
import { Textarea } from '@eylulg/ui/textarea';
import { useTranslations } from 'next-intl';
import { type KeyboardEvent, useId, useState } from 'react';
import type { Key } from 'react-aria-components';
import { Markdown } from './markdown';

type Mode = 'write' | 'preview';

/**
 * A Markdown textarea with a preview tab. Saves explicitly so a half typed edit is never stored.
 * The parent keys it by the saved value, so a newer description from the server resets the draft.
 */
export function DescriptionEditor({
  value,
  onSave,
}: {
  value: string;
  onSave: (value: string) => void;
}) {
  const t = useTranslations('issue');
  const tc = useTranslations('common');
  const headingId = useId();
  const [mode, setMode] = useState<Mode>(value ? 'preview' : 'write');
  const [draft, setDraft] = useState(value);

  const dirty = draft !== value;

  function save() {
    onSave(draft);
    setMode('preview');
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey) || !dirty) return;
    event.preventDefault();
    save();
  }

  function handleModeChange(key: Key) {
    setMode(key === 'preview' ? 'preview' : 'write');
  }

  function handleDiscard() {
    setDraft(value);
  }

  return (
    <section aria-labelledby={headingId} className='flex flex-col gap-3'>
      <div className='flex items-center justify-between gap-3'>
        <h2 id={headingId} className='text-sm font-semibold text-primary'>
          {t('description')}
        </h2>
        <SegmentedControl
          aria-label={t('descriptionMode')}
          size='sm'
          selectedKey={mode}
          onSelectionChange={handleModeChange}
        >
          <SegmentedControlItem id='write'>{tc('write')}</SegmentedControlItem>
          <SegmentedControlItem id='preview'>{tc('preview')}</SegmentedControlItem>
        </SegmentedControl>
      </div>
      {mode === 'write' ? (
        <Textarea
          aria-label={t('description')}
          value={draft}
          onChange={setDraft}
          rows={10}
          placeholder={t('descriptionPlaceholder')}
          hint={t('markdownHint')}
          font='data'
          onKeyDown={handleKeyDown}
        />
      ) : draft.trim() ? (
        <Markdown className='rounded-lg p-1'>{draft}</Markdown>
      ) : (
        <p className='text-sm text-tertiary italic'>{t('noDescription')}</p>
      )}
      {dirty && (
        <div className='flex justify-end gap-2'>
          <Button size='sm' variant='secondary' onPress={handleDiscard}>
            {tc('discard')}
          </Button>
          <Button size='sm' onPress={save}>
            {t('saveDescription')}
          </Button>
        </div>
      )}
    </section>
  );
}
