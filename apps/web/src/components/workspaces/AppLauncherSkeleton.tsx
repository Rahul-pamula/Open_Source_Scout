import React from 'react';

/** Closes #805: Shimmer pulse loading skeleton for App Launcher */
export const AppLauncherSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 p-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-[22%] bg-gray-800/60 border border-gray-700/40" />
          <div className="mt-2 w-12 h-3 bg-gray-800/60 rounded" />
        </div>
      ))}
    </div>
  );
};
