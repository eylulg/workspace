import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
    const t = useTranslations("notFound");
    return (
        <div className="flex flex-col items-start gap-3 px-4 py-16 sm:px-8">
            <p className="text-sm font-semibold text-brand-secondary">404</p>
            <h1 className="text-display-xs font-semibold text-primary">{t("title")}</h1>
            <p className="text-md text-tertiary">{t("body")}</p>
            <Link
                href="/issues"
                className="text-sm font-semibold text-brand-secondary underline-offset-4 outline-focus-ring hover:underline focus-visible:outline-2"
            >
                {t("back")}
            </Link>
        </div>
    );
}
