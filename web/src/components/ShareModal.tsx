import { useRef, useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { ShareCard, ShareCardData, ShareCardTheme } from './ShareCard';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ShareCardData;
  theme?: ShareCardTheme;
}

export function ShareModal({ isOpen, onClose, data, theme }: ShareModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const generateImage = useCallback(async () => {
    if (!cardRef.current) return null;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2, // Higher resolution
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      setPreviewUrl(dataUrl);
      return dataUrl;
    } catch (error) {
      console.error('Failed to generate image:', error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleDownload = useCallback(async () => {
    const dataUrl = previewUrl || (await generateImage());
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.download = `sandoro-stats-${new Date().toISOString().split('T')[0]}.png`;
    link.href = dataUrl;
    link.click();
  }, [previewUrl, generateImage]);

  const handleCopyToClipboard = useCallback(async () => {
    if (!cardRef.current) return;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        logging: false,
      });

      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ]);
            alert('Image copied to clipboard!');
          } catch {
            // Fallback: download instead
            handleDownload();
          }
        }
      }, 'image/png');
    } catch (error) {
      console.error('Failed to copy image:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [handleDownload]);

  const handleShare = useCallback(async () => {
    if (!navigator.share || !navigator.canShare) {
      // Fallback to download
      handleDownload();
      return;
    }

    if (!cardRef.current) return;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        logging: false,
      });

      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'sandoro-stats.png', { type: 'image/png' });
          const shareData = {
            files: [file],
            title: 'My Sandoro Stats',
            text: 'Check out my focus session stats!',
          };

          if (navigator.canShare(shareData)) {
            try {
              await navigator.share(shareData);
            } catch (error) {
              // User cancelled or share failed
              console.log('Share cancelled or failed:', error);
            }
          } else {
            handleDownload();
          }
        }
      }, 'image/png');
    } catch (error) {
      console.error('Failed to share:', error);
      handleDownload();
    } finally {
      setIsGenerating(false);
    }
  }, [handleDownload]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="relative max-w-[700px] max-h-[90vh] overflow-auto p-6 rounded-2xl"
        style={{ backgroundColor: 'var(--sandoro-bg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-sandoro-secondary/20 transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        <h2 className="text-lg font-bold mb-4">Share Your Stats</h2>

        {/* Preview Card */}
        <div className="mb-6 overflow-hidden rounded-xl">
          <ShareCard ref={cardRef} data={data} theme={theme} />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleShare}
            disabled={isGenerating}
            className="flex-1 px-4 py-3 bg-sandoro-primary text-white rounded-lg font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Share'}
          </button>
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="flex-1 px-4 py-3 border border-sandoro-secondary rounded-lg font-medium hover:bg-sandoro-secondary/20 transition-colors disabled:opacity-50"
          >
            Download
          </button>
          <button
            onClick={handleCopyToClipboard}
            disabled={isGenerating}
            className="flex-1 px-4 py-3 border border-sandoro-secondary rounded-lg font-medium hover:bg-sandoro-secondary/20 transition-colors disabled:opacity-50"
          >
            Copy
          </button>
        </div>

        <p className="mt-4 text-sm text-sandoro-secondary text-center">
          Share your focus journey on social media!
        </p>
      </div>
    </div>
  );
}
