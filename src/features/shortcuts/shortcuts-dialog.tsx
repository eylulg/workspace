'use client';

import { Dialog } from '@eylulg/ui/dialog';
import { Kbd } from '@eylulg/ui/kbd';
import { useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';
import { useWorkspace } from '@/features/workspace/workspace-context';
import { SHORTCUTS } from '@/lib/shortcuts';

const subscribe = () => () => {};
const readIsMac = () => /Mac|iPhone|iPad/.test(navigator.userAgent);
const serverIsMac = () => false;

export function ShortcutsDialog() {
  const t = useTranslations('shortcuts');
  const { helpOpen, setHelpOpen } = useWorkspace();
  // The platform is only known in the browser; the server renders "Ctrl".
  const isMac = useSyncExternalStore(subscribe, readIsMac, serverIsMac);

  return (
    <Dialog isOpen={helpOpen} onOpenChange={setHelpOpen} title={t('title')} closeLabel={t('close')}>
      <table className='w-full text-sm'>
        <caption className='sr-only'>{t('title')}</caption>
        <thead className='sr-only'>
          <tr>
            <th scope='col'>{t('action')}</th>
            <th scope='col'>{t('keys')}</th>
          </tr>
        </thead>
        <tbody>
          {SHORTCUTS.map((shortcut) => (
            <tr key={shortcut.id} className='border-b border-subtle last:border-0'>
              <th scope='row' className='py-2 pr-4 text-left font-normal text-secondary'>
                {t(shortcut.id)}
              </th>
              <td className='py-2 text-right whitespace-nowrap'>
                <Kbd
                  keys={shortcut.keys.map((key) => (key === 'mod' ? (isMac ? '⌘' : 'Ctrl') : key))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Dialog>
  );
}
