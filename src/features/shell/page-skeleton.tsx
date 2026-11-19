import { Skeleton } from '@eylulg/ui/skeleton';

export const PageSkeleton = () => (
  <div className='flex flex-col gap-4' aria-busy='true'>
    <Skeleton shape='rect' className='h-8 w-48' />
    <Skeleton shape='rect' className='h-9 max-w-xl' />
    <Skeleton shape='rect' className='h-64' />
  </div>
);
