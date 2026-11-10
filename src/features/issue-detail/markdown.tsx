import { cx } from "@eylulg/ui/cx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders Markdown without raw HTML, so user content cannot inject markup. */
export function Markdown({ children, className }: { children: string; className?: string }) {
    return (
        <div className={cx("prose prose-sm max-w-none prose-code:before:content-none prose-code:after:content-none", className)}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
        </div>
    );
}
