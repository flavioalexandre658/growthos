"use client";

import { useState } from "react";
import toast from "react-hot-toast";

interface LandingCtaFormProps {
  variant?: "hero" | "cta";
}

export function LandingCtaForm({ variant = "hero" }: LandingCtaFormProps) {
  const [email, setEmail] = useState("");

  const handleSubmit = () => {
    if (!email.includes("@")) {
      toast.error("Digite um e-mail válido");
      return;
    }
    toast.success("Você está na lista! Entraremos em contato em breve.");
    setEmail("");
  };

  if (variant === "cta") {
    return (
      <div className="flex flex-col sm:flex-row bg-zinc-900 border border-white/[0.07] rounded-xl p-2 gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Seu e-mail de trabalho"
          className="w-full sm:w-64 px-4 py-2.5 bg-transparent border-none outline-none text-zinc-200 text-base sm:text-sm placeholder:text-zinc-600 font-sans"
        />
        <button
          onClick={handleSubmit}
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold whitespace-nowrap hover:bg-indigo-500 transition-all shadow-[0_0_24px_rgba(79,70,229,0.4)]"
        >
          Solicitar acesso →
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 flex-col sm:flex-row">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="seu@email.com"
        className="w-full sm:w-72 px-4 py-3 rounded-xl bg-zinc-900 border border-white/[0.07] text-zinc-200 text-sm placeholder:text-zinc-600 outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-600/10 transition-all font-sans"
      />
      <button
        onClick={handleSubmit}
        className="px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold whitespace-nowrap hover:bg-indigo-500 transition-all shadow-[0_0_32px_rgba(79,70,229,0.4)] hover:-translate-y-0.5"
      >
        Começar grátis →
      </button>
    </div>
  );
}
