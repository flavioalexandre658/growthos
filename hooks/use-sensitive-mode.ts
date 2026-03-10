"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  maskName as _maskName,
  maskEmail as _maskEmail,
  maskPhone as _maskPhone,
  maskLocation as _maskLocation,
  maskCustomerId as _maskCustomerId,
} from "@/utils/mask-pii";

const STORAGE_KEY = "groware_sensitive_mode";

interface SensitiveModeContextValue {
  isSensitive: boolean;
  toggle: () => void;
  maskName: (v: string | null | undefined) => string;
  maskEmail: (v: string | null | undefined) => string;
  maskPhone: (v: string | null | undefined) => string;
  maskLocation: (city: string | null | undefined, country: string | null | undefined) => string;
  maskCustomerId: (v: string | null | undefined) => string;
}

export const SensitiveModeContext = createContext<SensitiveModeContextValue>({
  isSensitive: false,
  toggle: () => {},
  maskName: (v) => v ?? "",
  maskEmail: (v) => v ?? "",
  maskPhone: (v) => v ?? "",
  maskLocation: (city, country) => [city, country].filter(Boolean).join(", "),
  maskCustomerId: (v) => v ?? "",
});

export function useSensitiveMode() {
  return useContext(SensitiveModeContext);
}

export function useSensitiveModeState() {
  const [isSensitive, setIsSensitive] = useState(false);

  useEffect(() => {
    try {
      setIsSensitive(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    setIsSensitive((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);

  const maskName = useCallback(
    (v: string | null | undefined): string =>
      isSensitive ? _maskName(v) : (v ?? ""),
    [isSensitive]
  );
  const maskEmail = useCallback(
    (v: string | null | undefined): string =>
      isSensitive ? _maskEmail(v) : (v ?? ""),
    [isSensitive]
  );
  const maskPhone = useCallback(
    (v: string | null | undefined): string =>
      isSensitive ? _maskPhone(v) : (v ?? ""),
    [isSensitive]
  );
  const maskLocation = useCallback(
    (city: string | null | undefined, country: string | null | undefined): string =>
      isSensitive
        ? _maskLocation(city, country)
        : [city, country].filter(Boolean).join(", "),
    [isSensitive]
  );
  const maskCustomerId = useCallback(
    (v: string | null | undefined): string =>
      isSensitive ? _maskCustomerId(v) : (v ?? ""),
    [isSensitive]
  );

  return { isSensitive, toggle, maskName, maskEmail, maskPhone, maskLocation, maskCustomerId };
}
