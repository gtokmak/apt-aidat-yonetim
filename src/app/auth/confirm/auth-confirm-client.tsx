"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

function getSafeNext(nextRaw: string | null) {
  if (!nextRaw || !nextRaw.startsWith("/")) {
    return "/panel";
  }

  return nextRaw;
}

function readHashTokens() {
  const hash = window.location.hash.replace(/^#/, "");
  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

export function AuthConfirmClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();
      const next = getSafeNext(searchParams.get("next"));
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type") as EmailOtpType | null;

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            throw error;
          }
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash: tokenHash,
          });
          if (error) {
            throw error;
          }
        } else {
          const hashTokens = readHashTokens();
          if (!hashTokens) {
            throw new Error("Davet oturumu acilamadi.");
          }

          const { error } = await supabase.auth.setSession({
            access_token: hashTokens.accessToken,
            refresh_token: hashTokens.refreshToken,
          });

          if (error) {
            throw error;
          }
        }

        const cleanUrl = new URL(window.location.href);
        cleanUrl.hash = "";
        window.history.replaceState({}, "", cleanUrl.toString());
        router.replace(next);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Davet oturumu acilamadi.";
        router.replace(`/giris?error=${encodeURIComponent(message)}`);
      }
    };

    run();
  }, [router, searchParams]);

  return (
    <main className="mx-auto mt-24 max-w-xl rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-semibold text-slate-900">Oturum Hazirlaniyor</h1>
      <p className="mt-2 text-sm text-slate-600">
        Davet baglantisi dogrulaniyor, lutfen bekleyin.
      </p>
    </main>
  );
}
