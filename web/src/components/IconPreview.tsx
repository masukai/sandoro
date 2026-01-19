import { useState, useEffect } from 'react';
import { AsciiIcon } from './Timer/AsciiIcon';
import { type IconType } from '../hooks/useSupabaseSettings';

const ICON_TYPES: IconType[] = ['progress', 'hourglass', 'tomato', 'coffee'];

export function IconPreview() {
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [speed, setSpeed] = useState(50); // ms per step

  // Auto-play animation
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return p + 1;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [isPlaying, speed]);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-bold">Icon Preview (Debug Mode)</h2>

      {/* Controls */}
      <div className="flex flex-col gap-4 bg-sandoro-secondary/10 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm">Progress: {progress}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="flex-1"
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="text-sm">Speed: {speed}ms</label>
          <input
            type="range"
            min="10"
            max="200"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="flex-1"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setProgress(0);
              setIsPlaying(true);
            }}
            className="px-4 py-2 bg-sandoro-primary text-sandoro-bg rounded"
          >
            Play
          </button>
          <button
            onClick={() => setIsPlaying(false)}
            className="px-4 py-2 border border-sandoro-secondary rounded"
          >
            Pause
          </button>
          <button
            onClick={() => {
              setProgress(0);
              setIsPlaying(false);
            }}
            className="px-4 py-2 border border-sandoro-secondary rounded"
          >
            Reset
          </button>
          <button
            onClick={() => setIsBreak(!isBreak)}
            className={`px-4 py-2 rounded ${
              isBreak
                ? 'bg-sandoro-short-break text-sandoro-bg'
                : 'border border-sandoro-secondary'
            }`}
          >
            {isBreak ? 'Break Mode' : 'Work Mode'}
          </button>
        </div>
      </div>

      {/* Icon Grid */}
      <div className="grid grid-cols-2 gap-4">
        {ICON_TYPES.map((type) => (
          <div
            key={type}
            className="flex flex-col items-center gap-2 bg-sandoro-secondary/10 rounded-lg p-4"
          >
            <span className="text-sm font-bold capitalize">{type}</span>
            <div className="ascii-art">
              <AsciiIcon type={type} progress={progress} isBreak={isBreak} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
