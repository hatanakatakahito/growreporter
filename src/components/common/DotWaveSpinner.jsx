import React from 'react';

/**
 * Meta風 3ドットウェーブスピナー
 * @param {'xs' | 'sm' | 'md' | 'lg'} size - ドットサイズ
 * @param {'brand' | 'white'} variant - カラーバリアント
 */

const sizeConfig = {
  xs:  { dot: 4,  gap: 4,  y: 4 },
  sm:  { dot: 6,  gap: 4,  y: 6 },
  md:  { dot: 8,  gap: 6,  y: 10 },
  lg:  { dot: 10, gap: 6,  y: 12 },
};

const brandColors = ['#3758F9', '#7B55D1', '#CC52A9'];
const whiteColors = ['rgba(255,255,255,1)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0.6)'];

// サイズごとに一度だけ<style>をDOMに挿入するためのフラグ
const injected = new Set();

function injectKeyframes(size, y) {
  const name = `dotWave-${size}`;
  if (injected.has(name)) return name;
  const style = document.createElement('style');
  style.textContent = `@keyframes ${name}{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-${y}px);opacity:1}}`;
  document.head.appendChild(style);
  injected.add(name);
  return name;
}

export default function DotWaveSpinner({ size = 'lg', variant = 'brand' }) {
  const cfg = sizeConfig[size] || sizeConfig.lg;
  const colors = variant === 'white' ? whiteColors : brandColors;
  const animName = injectKeyframes(size, cfg.y);

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: cfg.gap }} role="status" aria-label="読み込み中">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: cfg.dot,
            height: cfg.dot,
            borderRadius: '50%',
            backgroundColor: colors[i],
            animation: `${animName} 1.4s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </span>
  );
}
