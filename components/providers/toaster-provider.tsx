"use client";

import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

export function ToasterProvider() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <Toaster
      position={isMobile ? "bottom-right" : "top-right"}
      containerStyle={isMobile ? { bottom: 80, right: 16 } : undefined}
      toastOptions={{
        style: {
          background: "#18181b",
          color: "#e4e4e7",
          border: "1px solid #27272a",
          borderRadius: "8px",
          fontSize: "13px",
        },
        success: {
          iconTheme: {
            primary: "#22c55e",
            secondary: "#18181b",
          },
        },
        error: {
          iconTheme: {
            primary: "#ef4444",
            secondary: "#18181b",
          },
        },
      }}
    />
  );
}
