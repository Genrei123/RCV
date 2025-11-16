import { StatsCard } from "./StatsCard";
import type { ReactNode } from "react";

export interface StatItem {
  icon: ReactNode;
  label: string;
  value: string | number;
  bgColor?: string;
}

interface StatsGridProps {
  stats: StatItem[];
  columns?: number;
  loading?: boolean;
}

export function StatsGrid({
  stats,
  columns = 3,
  loading = false,
}: StatsGridProps) {
  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-6 mb-8`}>
        {Array.from({ length: columns }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 app-bg-neutral rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 app-bg-neutral rounded mb-2"></div>
                  <div className="h-8 app-bg-neutral rounded w-20"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const gridColsClass =
    columns === 2
      ? "md:grid-cols-2"
      : columns === 3
      ? "md:grid-cols-3"
      : columns === 4
      ? "md:grid-cols-4"
      : "md:grid-cols-3";

  return (
    <div className={`grid grid-cols-1 ${gridColsClass} gap-6 mb-8`}>
      {stats.map((stat, index) => (
        <StatsCard
          key={index}
          icon={stat.icon}
          label={stat.label}
          value={stat.value}
          bgColor={stat.bgColor}
        />
      ))}
    </div>
  );
}
