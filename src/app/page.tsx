import { redirect } from "next/navigation";

type HomeSearchParams = Record<string, string | string[] | undefined>;

function getSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const params = await searchParams;
  const code = getSearchParam(params.code);
  const tokenHash = getSearchParam(params.token_hash);
  const type = getSearchParam(params.type);
  const next = getSearchParam(params.next);

  const isAuthCallback = Boolean(code || (tokenHash && type));

  if (isAuthCallback) {
    const confirmParams = new URLSearchParams();
    if (code) {
      confirmParams.set("code", code);
    }
    if (tokenHash) {
      confirmParams.set("token_hash", tokenHash);
    }
    if (type) {
      confirmParams.set("type", type);
    }
    confirmParams.set("next", next && next.startsWith("/") ? next : "/davet");
    redirect(`/auth/confirm?${confirmParams.toString()}`);
  }

  redirect("/panel");
}
