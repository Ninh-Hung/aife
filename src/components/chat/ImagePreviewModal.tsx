import React from 'react';
import { Download, X } from 'lucide-react';

interface ImagePreviewModalProps {
  open: boolean;
  src: string;
  alt: string;
  onClose: () => void;
  onDownload?: () => void;
  downloadDisabled?: boolean;
  downloadTitle?: string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  open,
  src,
  alt,
  onClose,
  onDownload,
  downloadDisabled = false,
  downloadTitle = 'Download image',
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/75 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative max-h-[min(92vh,calc(100dvh-3.5rem))] w-full overflow-hidden rounded-t-2xl border-t border-white/15 bg-black sm:inline-block sm:max-h-[90vh] sm:w-auto sm:max-w-[90vw] sm:rounded-md sm:border-0 sm:bg-transparent"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="block max-h-[min(92vh,calc(100dvh-3.5rem))] w-full object-contain shadow-2xl sm:max-h-[90vh] sm:max-w-[90vw] sm:rounded-md"
        />
        <div className="absolute right-2 top-2 z-10 flex items-center gap-2">
          {onDownload && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!downloadDisabled) {
                  void onDownload();
                }
              }}
              disabled={downloadDisabled}
              title={downloadTitle}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 disabled:cursor-wait disabled:opacity-70"
            >
              <Download size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Close preview"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
