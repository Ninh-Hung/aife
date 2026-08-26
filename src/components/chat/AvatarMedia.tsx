/**
 * AvatarMedia Component
 * Renders an image or video avatar based on type, with a fallback icon.
 * When `type` is not provided, video is detected from the URL file extension.
 */

import React from 'react';

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.ogg', '.ogv'];

const isVideoUrl = (url: string): boolean => {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return VIDEO_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  } catch {
    // Fallback for relative URLs
    return VIDEO_EXTENSIONS.some((ext) => url.toLowerCase().split('?')[0].endsWith(ext));
  }
};

interface AvatarMediaProps {
  src?: string | null;
  type?: 'image' | 'video';
  alt?: string;
  /** Tailwind classes applied to the <img> or <video> element */
  mediaClassName?: string;
  /** Fallback element shown when src is empty */
  fallback: React.ReactNode;
}

export const AvatarMedia: React.FC<AvatarMediaProps> = ({
  src,
  type,
  alt = '',
  mediaClassName = 'h-full w-full rounded-full object-cover',
  fallback,
}) => {
  if (!src) return <>{fallback}</>;

  const isVideo = type === 'video' || (type === undefined && isVideoUrl(src));

  if (isVideo) {
    return <video src={src} className={mediaClassName} muted autoPlay loop playsInline />;
  }

  return <img src={src} alt={alt} className={mediaClassName} />;
};
