'use client';

function Shimmer({ className }) {
  return (
    <div className={`relative overflow-hidden bg-gray-200 rounded-lg ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="rounded-lg overflow-hidden bg-white border border-[#EBEBEB] shadow-sm">
      <div className="relative aspect-[4/3]">
        <Shimmer className="w-full h-full rounded-none" />
        <div className="absolute top-3 left-3 flex gap-2">
          <Shimmer className="w-16 h-6 rounded-lg" />
          <Shimmer className="w-24 h-6 rounded-lg" />
        </div>
        <div className="absolute top-3 right-3">
          <Shimmer className="w-20 h-6 rounded-lg" />
        </div>
      </div>
      <div className="p-5 space-y-3">
        <Shimmer className="w-3/4 h-6" />
        <Shimmer className="w-1/3 h-8" />
        <Shimmer className="w-full h-4" />
        <Shimmer className="w-full h-12 rounded-2xl" />
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-white border border-[#EBEBEB] shadow-sm">
      <div className="relative aspect-square">
        <Shimmer className="w-full h-full rounded-none" />
        <div className="absolute top-2 left-2">
          <Shimmer className="w-14 h-5 rounded-full" />
        </div>
        <div className="absolute bottom-2 right-2">
          <Shimmer className="w-14 h-5 rounded-full" />
        </div>
      </div>
      <div className="p-3 space-y-2">
        <Shimmer className="w-full h-4" />
        <Shimmer className="w-1/2 h-6" />
        <Shimmer className="w-full h-2" />
        <Shimmer className="w-full h-10 rounded-xl" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function HeroSectionSkeleton() {
  return (
    <div className="space-y-6">
      <HeroSkeleton />
      <GridSkeleton count={4} />
    </div>
  );
}
