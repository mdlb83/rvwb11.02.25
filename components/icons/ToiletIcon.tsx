import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface ToiletIconProps {
  size?: number;
  color?: string;
}

export default function ToiletIcon({ size = 20, color = '#666' }: ToiletIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Toilet bowl - top view style */}
      <Path
        d="M7 6C6.45 6 6 6.45 6 7V16C6 16.55 6.45 17 7 17H17C17.55 17 18 16.55 18 16V7C18 6.45 17.55 6 17 6H7Z"
        fill={color}
        stroke={color}
        strokeWidth="1.2"
      />
      {/* Toilet seat - oval shape */}
      <Path
        d="M7 6C6.45 6 6 6.45 6 7C6 7.55 6.45 8 7 8H17C17.55 8 18 7.55 18 7C18 6.45 17.55 6 17 6H7Z"
        fill={color}
        opacity="0.8"
      />
      {/* Water in bowl */}
      <Path
        d="M7 13C7 12.45 7.45 12 8 12H16C16.55 12 17 12.45 17 13C17 13.55 16.55 14 16 14H8C7.45 14 7 13.55 7 13Z"
        fill={color}
        opacity="0.4"
      />
    </Svg>
  );
}

