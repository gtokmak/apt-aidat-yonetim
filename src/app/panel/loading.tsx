export default function PanelLoading() {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-slate-200 bg-white/90">
      <div className="flex items-center gap-3 text-slate-700">
        <span
          aria-hidden="true"
          className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-r-transparent"
        />
        <p className="text-sm font-medium">Veriler yukleniyor...</p>
      </div>
    </div>
  );
}
