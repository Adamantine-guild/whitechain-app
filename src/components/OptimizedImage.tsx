import React from 'react';
import Image, { ImageProps } from 'next/image';

export const OptimizedImage: React.FC<ImageProps> = (props) => {
  return (
    <Image
      {...props}
      loading="lazy"
      placeholder="blur"
      blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMxZTI5M2IiLz48L3N2Zz4="
      className={`transition-opacity duration-300 ${props.className || ''}`}
    />
  );
};
