/** Single source for the shortcut help dialog and the keyboard handler. Labels live in messages under `shortcuts`. */
export const SHORTCUTS = [
  { id: 'palette', keys: ['mod', 'K'] },
  { id: 'create', keys: ['C'] },
  { id: 'help', keys: ['?'] },
  { id: 'search', keys: ['/'] },
  { id: 'goIssues', keys: ['G', 'I'] },
  { id: 'goProjects', keys: ['G', 'P'] },
  { id: 'goLabels', keys: ['G', 'L'] },
  { id: 'toggleView', keys: ['V'] },
  { id: 'next', keys: ['J'] },
  { id: 'previous', keys: ['K'] },
  { id: 'status', keys: ['S'] },
  { id: 'priority', keys: ['P'] },
  { id: 'assignee', keys: ['A'] },
] as const;

/** Window event for shortcuts that a mounted view handles, like toggling list and board. */
export const SHORTCUT_EVENT = 'workspace:shortcut';

/** True when a key press should go to a text field or an open overlay instead of a shortcut. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (target as HTMLInputElement).type;
    return !['checkbox', 'radio', 'button', 'submit'].includes(type);
  }
  return Boolean(target.closest('[role="dialog"], [role="menu"], [role="listbox"]'));
}
