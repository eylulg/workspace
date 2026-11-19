import { useState } from 'react';

/** True from the first time `open` is true onwards, so a lazy dialog mounts on first open and then stays. */
export function useOpenedOnce(open: boolean) {
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);
  return opened;
}
