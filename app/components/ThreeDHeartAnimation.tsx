'use client';

import { useEffect, useRef } from 'react';

export function ThreeDHeartAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let angleX = 0;
    let angleY = 0;
    let time = 0;

    const width = 260;
    const height = 260;
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    // 3D Heart parametric shape vertices generator
    const generateHeartVertices = () => {
      const vertices: { x: number; y: number; z: number; color: string }[] = [];
      const numPoints = 600;

      for (let i = 0; i < numPoints; i++) {
        const t = (i / numPoints) * Math.PI * 2;
        const u = (Math.random() - 0.5) * Math.PI;

        // 3D Parametric Heart equation
        const x = 16 * Math.sin(t) ** 3;
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        const z = u * 8 * Math.sin(t);

        const r = Math.floor(245 + Math.sin(t * 2) * 10);
        const g = Math.floor(80 + Math.cos(t) * 40);
        const b = Math.floor(110 + Math.sin(u) * 40);

        vertices.push({
          x: x * 5.2,
          y: y * 5.2,
          z: z * 4.5,
          color: `rgb(${r}, ${g}, ${b})`,
        });
      }
      return vertices;
    };

    const heartVertices = generateHeartVertices();

    // Floating 3D sparkle particles
    const particles = Array.from({ length: 40 }, () => ({
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200,
      z: (Math.random() - 0.5) * 150,
      size: Math.random() * 3.5 + 1.5,
      speed: Math.random() * 0.02 + 0.01,
    }));

    const render = () => {
      time += 0.02;
      angleY += 0.018;
      angleX = Math.sin(time * 0.5) * 0.15;

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2 + 10;
      const focalLength = 300;

      // Render 3D Background Glow
      const glowGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 110);
      glowGrad.addColorStop(0, 'rgba(255, 95, 114, 0.25)');
      glowGrad.addColorStop(0.6, 'rgba(241, 23, 166, 0.1)');
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 110, 0, Math.PI * 2);
      ctx.fill();

      // Project and render 3D Sparkle particles
      particles.forEach((p) => {
        p.z += Math.sin(time + p.x) * 0.5;
        const cosY = Math.cos(angleY * 0.5);
        const sinY = Math.sin(angleY * 0.5);
        const px = p.x * cosY - p.z * sinY;
        const pz = p.x * sinY + p.z * cosY;

        const scale = focalLength / (focalLength + pz + 100);
        const sx = cx + px * scale;
        const sy = cy + p.y * scale;

        if (scale > 0) {
          ctx.fillStyle = `rgba(255, 220, 150, ${Math.min(1, scale * 0.8)})`;
          ctx.beginPath();
          ctx.arc(sx, sy, p.size * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Project and render 3D Parametric Heart
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      // Sort vertices by Z for depth rendering
      const projected = heartVertices
        .map((v) => {
          // Rotate around Y
          let x1 = v.x * cosY - v.z * sinY;
          let z1 = v.x * sinY + v.z * cosY;

          // Rotate around X
          let y2 = v.y * cosX - z1 * sinX;
          let z2 = v.y * sinX + z1 * cosX;

          // Breathing scale pulse effect
          const pulse = 1 + Math.sin(time * 3) * 0.05;
          x1 *= pulse;
          y2 *= pulse;

          const scale = focalLength / (focalLength + z2);
          const sx = cx + x1 * scale;
          const sy = cy + y2 * scale;

          return { sx, sy, scale, z2, color: v.color };
        })
        .sort((a, b) => b.z2 - a.z2);

      projected.forEach((p) => {
        const radius = Math.max(0.5, p.scale * 2.4);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.min(1, Math.max(0.2, p.scale * 0.9));
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;

      // Draw central 3D metallic Wink badge
      ctx.save();
      ctx.translate(cx, cy);
      const badgeScale = 1 + Math.sin(time * 3) * 0.04;
      ctx.scale(badgeScale, badgeScale);

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(255, 95, 114, 0.6)';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();

      // Wink Sparkle Icon inside 3D badge
      ctx.fillStyle = '#ff5f72';
      ctx.shadowBlur = 0;
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✨', 0, 1);
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="three-d-heart-container">
      <canvas ref={canvasRef} className="three-d-canvas" />
      <div className="three-d-label">
        <span>3D GetWink Match Engine</span>
      </div>
    </div>
  );
}
