declare global {
  interface Window {
    Groware?: {
      identify: (id: string, traits: Record<string, unknown>) => void;
      track: (event: string, props: Record<string, unknown>) => void;
      reset: () => void;
    };
  }
}

interface GrowareTraits {
  name?: string;
  email?: string;
  phone?: string;
}

interface GrowareTrackProps {
  dedupe?: boolean | string;
  customer_type?: "new" | "returning";
  customer_id?: string;
  product_id?: string;
  product_name?: string;
  category?: string;
  gross_value?: number;
  currency?: string;
  discount?: number;
  installments?: number;
  payment_method?: string;
}

export function growareIdentify(id: string, traits: GrowareTraits): void {
  if (typeof window === "undefined" || !window.Groware) return;
  window.Groware.identify(id, traits as Record<string, unknown>);
}

export function growareTrack(event: string, props: GrowareTrackProps): void {
  if (typeof window === "undefined" || !window.Groware) return;
  window.Groware.track(event, props as Record<string, unknown>);
}

export function growareReset(): void {
  if (typeof window === "undefined" || !window.Groware) return;
  window.Groware.reset();
}
