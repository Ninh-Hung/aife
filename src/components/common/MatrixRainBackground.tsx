import React, { useEffect, useRef } from 'react';

const CHARACTERS =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const FONT_SIZE = 16;
const FRAME_INTERVAL_MS = 60;

export const MatrixRainBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animationFrameId = 0;
    let lastFrameTime = 0;
    let columns = 0;
    let drops: number[] = [];

    const getCanvasSize = () => {
      const bounds = canvas.parentElement?.getBoundingClientRect();

      return {
        width: Math.max(1, Math.floor(bounds?.width || window.innerWidth)),
        height: Math.max(1, Math.floor(bounds?.height || window.innerHeight)),
      };
    };

    const resizeCanvas = () => {
      const pixelRatio = window.devicePixelRatio || 1;
      const { width, height } = getCanvasSize();

      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      columns = Math.ceil(width / FONT_SIZE);
      drops = Array.from({ length: columns }, () =>
        Math.floor(Math.random() * (height / FONT_SIZE))
      );

      context.fillStyle = '#07111f';
      context.fillRect(0, 0, width, height);
    };

    const draw = (timestamp: number) => {
      animationFrameId = window.requestAnimationFrame(draw);

      if (timestamp - lastFrameTime < FRAME_INTERVAL_MS) {
        return;
      }

      lastFrameTime = timestamp;

      const { width, height } = getCanvasSize();

      context.fillStyle = 'rgba(7, 17, 31, 0.14)';
      context.fillRect(0, 0, width, height);
      context.font = `${FONT_SIZE}px monospace`;

      for (let columnIndex = 0; columnIndex < drops.length; columnIndex += 1) {
        const character = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
        const x = columnIndex * FONT_SIZE;
        const y = drops[columnIndex] * FONT_SIZE;

        context.fillStyle = 'rgba(190, 255, 219, 0.88)';
        context.fillText(character, x, y);
        context.fillStyle = 'rgba(20, 184, 166, 0.45)';
        context.fillText(character, x, y - FONT_SIZE);

        if (y > height && Math.random() > 0.975) {
          drops[columnIndex] = 0;
        } else {
          drops[columnIndex] += 1;
        }
      }
    };

    const renderStaticFrame = () => {
      const { width, height } = getCanvasSize();

      context.fillStyle = '#07111f';
      context.fillRect(0, 0, width, height);
      context.font = `${FONT_SIZE}px monospace`;

      for (let columnIndex = 0; columnIndex < drops.length; columnIndex += 1) {
        const x = columnIndex * FONT_SIZE;
        const rows = Math.ceil(height / FONT_SIZE);

        for (let rowIndex = 0; rowIndex < rows; rowIndex += 4) {
          const character = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
          const opacity = 0.12 + Math.random() * 0.28;

          context.fillStyle = `rgba(45, 212, 191, ${opacity})`;
          context.fillText(character, x, rowIndex * FONT_SIZE);
        }
      }
    };

    const start = () => {
      window.cancelAnimationFrame(animationFrameId);
      resizeCanvas();

      if (reducedMotionQuery.matches) {
        renderStaticFrame();
        return;
      }

      animationFrameId = window.requestAnimationFrame(draw);
    };

    start();

    const resizeObserver = new ResizeObserver(start);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    window.addEventListener('resize', start);
    reducedMotionQuery.addEventListener('change', start);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', start);
      reducedMotionQuery.removeEventListener('change', start);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.16),transparent_42%),linear-gradient(180deg,rgba(10,22,40,0.2),rgba(10,22,40,0.9))]" />
    </div>
  );
};
