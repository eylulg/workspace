import { Skeleton } from "@eylulg/ui/skeleton";

// The footer follows the skeleton. A short skeleton leaves it in view, and it jumps away when the page streams in.
export const PageSkeleton = () => (
    <div className="flex min-h-dvh flex-col gap-4" aria-busy="true">
        <Skeleton shape="rect" className="h-8 w-48" />
        <Skeleton shape="rect" className="h-9 max-w-xl" />
        <Skeleton shape="rect" className="h-64" />
    </div>
);
