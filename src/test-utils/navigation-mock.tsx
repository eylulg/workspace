import { type AnchorHTMLAttributes, type ReactNode, forwardRef } from 'react';
import { vi } from 'vitest';

/** A stand in for the Next.js app router that records navigations. */
export const router = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  pathname: '/en/issues',
  search: '',
  reset() {
    this.push.mockReset();
    this.replace.mockReset();
    this.pathname = '/en/issues';
    this.search = '';
  },
};

export const nextNavigation = {
  useRouter: () => router,
  usePathname: () => router.pathname,
  useSearchParams: () => new URLSearchParams(router.search),
  useParams: () => ({ locale: 'en' }),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  notFound: vi.fn(),
};

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string | { pathname: string };
  prefetch?: unknown;
  children?: ReactNode;
};

const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, children, ...props },
  ref,
) {
  const anchorProps = Object.fromEntries(
    Object.entries(props).filter(([key]) => key !== 'prefetch' && key !== 'locale'),
  );
  return (
    <a ref={ref} href={typeof href === 'string' ? href : href.pathname} {...anchorProps}>
      {children}
    </a>
  );
});

export const nextLink = { default: Link, __esModule: true };
