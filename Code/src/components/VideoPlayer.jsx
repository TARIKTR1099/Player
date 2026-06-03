import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useStore } from '../store';
import SubtitleOverlay from './SubtitleOverlay';

const VideoPlayer = ({ track, audioRef }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const { videoEffects, mapping } = useStore();

  // Derive video URL from track
  const getVideoUrl = useCallback(() => {
    if (track?.url) return track.url;
    if (track?.streamUrl) return track.streamUrl;
    if (track?.location) return `file://${track.location}`;
    return '';
  }, [track]);

  useEffect(() => {
    const url = getVideoUrl();
    if (videoRef.current) {
      videoRef.current.src = url;
      videoRef.current.load();
    }
  }, [track, getVideoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef?.current;
    if (!video || !audio) return;

    const syncPlay = () => { if (audio && !audio.paused) video.play().catch(() => {}); };
    const syncPause = () => video.pause();
    const syncSeek = () => {
      const offset = useStore.getState().mapping.avSyncOffset / 1000;
      const target = audio.currentTime + offset;
      if (Math.abs(video.currentTime - target) > 0.3) {
        video.currentTime = target;
      }
    };

    audio.addEventListener('play', syncPlay);
    audio.addEventListener('pause', syncPause);
    audio.addEventListener('seeked', syncSeek);

    // Initial sync
    if (audio.paused) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
    syncSeek();

    return () => {
      audio.removeEventListener('play', syncPlay);
      audio.removeEventListener('pause', syncPause);
      audio.removeEventListener('seeked', syncSeek);
    };
  }, [audioRef, track]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const update = () => setCurrentTime(video.currentTime);
    video.addEventListener('timeupdate', update);
    return () => video.removeEventListener('timeupdate', update);
  }, [track]);

  // Determine if canvas 2D effects are needed
  const needsCanvas = videoEffects.threshold > 0 || videoEffects.posterize > 0 || videoEffects.oldPhoto;

  // Compute CSS filter string
  const cssFilter = [
    `brightness(${videoEffects.brightness / 100})`,
    `contrast(${videoEffects.contrast / 100})`,
    `saturate(${videoEffects.saturation / 100})`,
    videoEffects.gamma !== 100 ? `brightness(${videoEffects.gamma / 100})` : '',
    videoEffects.sharpness > 0 ? `contrast(${1 + videoEffects.sharpness / 200})` : '',
    videoEffects.motionBlur > 0 ? `blur(${videoEffects.motionBlur * 0.05}px)` : '',
  ].filter(Boolean).join(' ');

  // Compute CSS transform
  const transforms = [];
  if (videoEffects.flipH) transforms.push('scaleX(-1)');
  if (videoEffects.flipV) transforms.push('scaleY(-1)');
  if (videoEffects.rotate !== 0) transforms.push(`rotate(${videoEffects.rotate}deg)`);
  if (videoEffects.zoom !== 100) transforms.push(`scale(${videoEffects.zoom / 100})`);
  const cssTransform = transforms.join(' ');

  // Crop via clip-path
  const { cropTop, cropBottom, cropLeft, cropRight } = videoEffects;
  const hasCrop = cropTop > 0 || cropBottom > 0 || cropLeft > 0 || cropRight > 0;
  const clipPath = hasCrop ? `inset(${cropTop}% ${cropRight}% ${cropBottom}% ${cropLeft}%)` : undefined;

  // Canvas rendering for color effects
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const renderLoop = () => {
      if (video.readyState >= 2 && needsCanvas) {
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth || canvas.width;
        canvas.height = video.videoHeight || canvas.height;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (videoEffects.threshold > 0 || videoEffects.posterize > 0 || videoEffects.oldPhoto) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          if (videoEffects.threshold > 0) {
            const t = videoEffects.threshold;
            for (let i = 0; i < data.length; i += 4) {
              const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
              const val = gray >= t ? 255 : 0;
              data[i] = data[i + 1] = data[i + 2] = val;
            }
          }

          if (videoEffects.posterize > 0 && !videoEffects.threshold) {
            const levels = Math.max(2, videoEffects.posterize);
            const step = 256 / levels;
            for (let i = 0; i < data.length; i += 4) {
              data[i] = Math.round(data[i] / step) * step;
              data[i + 1] = Math.round(data[i + 1] / step) * step;
              data[i + 2] = Math.round(data[i + 2] / step) * step;
            }
          }

          if (videoEffects.oldPhoto) {
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              data[i] = r * 0.393 + g * 0.769 + b * 0.189;
              data[i + 1] = r * 0.349 + g * 0.686 + b * 0.168;
              data[i + 2] = r * 0.272 + g * 0.534 + b * 0.131;
            }
          }

          ctx.putImageData(imageData, 0, 0);
        }
      }
      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    if (needsCanvas) {
      animFrameRef.current = requestAnimationFrame(renderLoop);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [needsCanvas, videoEffects.threshold, videoEffects.posterize, videoEffects.oldPhoto]);

  if (!track?.isVideo) return null;

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-black relative overflow-hidden">
      {/* Unified video element */}
      <video
        ref={videoRef}
        muted
        playsInline
        className={needsCanvas ? "hidden" : "max-w-full max-h-full"}
        style={needsCanvas ? undefined : {
          objectFit: 'contain',
          filter: cssFilter || undefined,
          transform: cssTransform || undefined,
          clipPath: clipPath,
        }}
      />

      {/* Canvas overlay for color effects */}
      {needsCanvas && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'contain' }}
        />
      )}

      {/* Logo overlay */}
      {videoEffects.logoImage && (
        <div
          className="absolute pointer-events-none z-20"
          style={{
            left: `${videoEffects.logoX}%`,
            top: `${videoEffects.logoY}%`,
            transform: 'translate(-50%, -50%)',
            opacity: videoEffects.logoOpacity / 100,
            width: `${videoEffects.logoSize}%`,
          }}
        >
          <img src={videoEffects.logoImage} className="w-full h-auto" alt="logo" />
        </div>
      )}

      {/* Text overlay */}
      {videoEffects.textContent && (
        <div
          className="absolute pointer-events-none z-20 font-bold whitespace-nowrap"
          style={{
            left: `${videoEffects.textX}%`,
            top: `${videoEffects.textY}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: `${videoEffects.textSize}px`,
            color: videoEffects.textColor || '#ffffff',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          }}
        >
          {videoEffects.textContent}
        </div>
      )}

      {/* Subtitle overlay */}
      <SubtitleOverlay currentTime={currentTime} />
    </div>
  );
};

export default VideoPlayer;
