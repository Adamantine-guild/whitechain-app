import React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1.5rem',
  className = ''
}) => {
  return (
    <div
      style={{ width, height }}
      className={`animate-pulse bg-gray-300 dark:bg-gray-700 rounded ${className}`}
    />
  );
};
