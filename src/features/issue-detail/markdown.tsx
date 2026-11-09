import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cx } from "@/utils/cx";

/** Renders Markdown without raw HTML, so user content cannot inject markup. */
export function Markdown({ children, className }: { children: string; className?: string }) {
    return (
        <div
            className={cx(
                "prose prose-sm max-w-none text-secondary dark:prose-invert prose-headings:text-primary prose-a:text-brand-secondary prose-code:before:content-none prose-code:after:content-none",
                className,
            )}
        >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
        </div>
    );
}
