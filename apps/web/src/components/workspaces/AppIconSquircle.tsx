import React, { useState } from 'react';
import { getNextFallbackUrl, getInitialsSquircleData } from '../../utils/faviconResolver';

interface AppIconSquircleProps {
  title: string;
  url: string;
  iconUrl?: string | null;
  size?: number;
}

/** Closes #797: Squircle App Icon tile with mobile launcher aesthetic */
export const AppIconSquircle: React.FC<AppIconSquircleProps> = ({
  title,
  url,
  iconUrl,
  size = 64,
}) => {
  const [attempt, setAttempt] = useState<number>(0);
  const [loadError, setLoadError] = useState<boolean>(false);

  const handleError = () => {
    const nextUrl = getNextFallbackUrl(url, attempt + 1);
    if (nextUrl) {
      setAttempt((prev) => prev + 1);
    } else {
      setLoadError(true);
    }
  };

  const currentIconUrl = iconUrl || getNextFallbackUrl(url, attempt);
  const fallbackData = getInitialsSquircleData(title || url);

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-[22%] bg-gray-900 border border-gray-800 shadow-md flex items-center justify-center overflow-hidden transition-all duration-200 select-none"
    >
      {!loadError && currentIconUrl ? (
        <img
          src={currentIconUrl}
          alt={title}
          onError={handleError}
          className="w-3/5 h-3/5 object-contain"
          loading="lazy"
        />
      ) : (
        <div
          style={{ backgroundColor: fallbackData.bgColor }}
          className="w-full h-full flex items-center justify-center text-white font-bold text-sm tracking-wide"
        >
          {fallbackData.initials}
        </div>
      )}
    </div>
  );
};
