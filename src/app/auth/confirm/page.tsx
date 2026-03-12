import { Suspense } from "react";

import { AuthConfirmClient } from "./auth-confirm-client";

export const dynamic = "force-dynamic";

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto mt-8 max-w-xl rounded-2xl border border-slate-200 bg-white p-4 sm:mt-24 sm:p-6">
          <h1 className="text-xl font-semibold text-slate-900">Oturum Hazirlaniyor</h1>
          <p className="mt-2 text-sm text-slate-600">
            Davet baglantisi dogrulaniyor, lutfen bekleyin.
          </p>
        </main>
      }
    >
      <AuthConfirmClient />
    </Suspense>
  );
}
