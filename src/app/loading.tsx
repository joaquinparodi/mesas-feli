export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="relative mx-auto mb-6 h-16 w-16">
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-purple-500/20" />
          <div
            className="absolute inset-1 animate-spin rounded-full border-2 border-transparent border-t-purple-500 border-r-pink-500"
          />
          <div className="absolute inset-2 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600">
            <span className="text-lg font-bold text-white">MV</span>
          </div>
        </div>
        <p className="text-sm text-white/40 animate-pulse">Cargando...</p>
      </div>
    </div>
  );
}
