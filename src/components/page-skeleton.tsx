export default function PageSkeleton({
  title,
  cards = 2,
}: {
  title?: string;
  cards?: number;
}) {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-24 rounded bg-slate-200" />
      {title ? (
        <div className="mt-2 h-7 w-56 rounded bg-slate-200" />
      ) : (
        <div className="mt-2 h-7 w-40 rounded bg-slate-200" />
      )}
      <div className="mt-2 h-4 w-72 rounded bg-slate-100" />

      <div className="mt-6 h-12 w-full rounded-xl bg-slate-100" />

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-5"
          >
            <div className="h-5 w-32 rounded bg-slate-200" />
            <div className="space-y-2">
              <div className="h-10 w-full rounded-lg bg-slate-100" />
              <div className="h-10 w-full rounded-lg bg-slate-100" />
              <div className="h-10 w-3/4 rounded-lg bg-slate-100" />
            </div>
            <div className="h-10 w-full rounded-lg bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
