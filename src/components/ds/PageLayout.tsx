import type { ReactNode } from "react";

export function PageLayout({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl animate-fade-in-up">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-700 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="pt-6">{children}</div>
    </div>
  );
}
