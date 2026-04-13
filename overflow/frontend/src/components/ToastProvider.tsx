"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      theme="dark"
      position="top-right"
      richColors
      toastOptions={{
        style: {
          background: "#161B22",
          border: "1px solid #30363D",
          color: "#E6EDF3",
          fontSize: "13px",
        },
        classNames: {
          success: "!bg-[#1C4A2A] !border-[#3FB950]/30 !text-[#3FB950]",
          error: "!bg-[#4A1C1C] !border-[#F85149]/30 !text-[#F85149]",
        },
      }}
    />
  );
}
