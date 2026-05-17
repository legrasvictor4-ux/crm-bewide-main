import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} {...props}>
          {/* Icône myclerk — on affiche uniquement la partie badge (gauche du logo) */}
          <div className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden">
            <img
              src="/myclerk-logo.png"
              alt=""
              className="h-full w-auto"
              style={{ maxWidth: "none" }}
            />
          </div>

          {/* Contenu */}
          <div className="flex-1 min-w-0 pr-4">
            {/* En-tête : nom app + timestamp */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-gray-400 tracking-wide uppercase">
                myclerk
              </span>
              <span className="text-[11px] text-gray-400">now</span>
            </div>

            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>

          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
