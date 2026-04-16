type ToastVariant = "success" | "error";

const variantClass: Record<ToastVariant, string> = {
  success: "border-emerald-200 bg-white text-slate-900 shadow-emerald-100/80",
  error: "border-rose-200 bg-white text-slate-900 shadow-rose-100/80",
};

export function Toast({
  message,
  variant = "success",
  onClose,
}: {
  message: string;
  variant?: ToastVariant;
  onClose?: () => void;
}) {
  return (
    <div
      className={`fixed bottom-4 right-4 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border px-4 py-3 shadow-lg backdrop-blur ${variantClass[variant]}`}
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
    >
      <div className="flex items-start gap-3">
        <p className="flex-1 text-sm font-medium">{message}</p>
        {onClose ? (
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200"
            onClick={onClose}
            aria-label="Dismiss notification"
          >
            Close
          </button>
        ) : null}
      </div>
    </div>
  );
}
