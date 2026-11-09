export const PageSkeleton = () => (
    <div className="flex flex-col gap-4 px-4 py-6 sm:px-8" aria-busy="true">
        <div className="h-8 w-48 animate-pulse rounded-md bg-secondary motion-reduce:animate-none" />
        <div className="bg-secondary_subtle h-9 w-full max-w-xl animate-pulse rounded-md motion-reduce:animate-none" />
        {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="bg-secondary_subtle h-10 animate-pulse rounded-md motion-reduce:animate-none" />
        ))}
    </div>
);
