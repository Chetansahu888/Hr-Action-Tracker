import React from 'react';

interface AppLogoProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 28,
  color = '#55642a',
  className = '',
  style = {}
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <path
        d="M15 28.5 C15 28.5, 30.5 19.5, 50 19.5 C69.5 19.5, 85 28.5, 85 28.5 V81.5 H47.5 V67.5 H71 V38 C71 38, 61.5 33.5, 50 33.5 C38.5 33.5, 29 38, 29 38 V81.5 H15 Z"
        fill={color}
      />
    </svg>
  );
};

export default AppLogo;
