/* eslint-disable @next/next/no-img-element */

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImageWithFallback } from './ImageWithFallback';

vi.mock('next/image', () => ({
  default: ({
    alt,
    blurDataURL,
    placeholder,
    unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    blurDataURL?: string;
    placeholder?: string;
    unoptimized?: boolean;
  }) => (
    <img
      {...props}
      alt={alt ?? ''}
      loading={props.loading ?? 'lazy'}
      data-blur-data-url={blurDataURL}
      data-placeholder={placeholder}
      data-unoptimized={String(Boolean(unoptimized))}
    />
  )
}));

describe('ImageWithFallback', () => {
  afterEach(cleanup);

  it('reserves space, lazy-loads, and supplies a blur placeholder', () => {
    render(
      <ImageWithFallback
        src="https://coin-images.coingecko.com/coins/images/token.png"
        alt="Token"
        width={32}
        height={32}
        fallback={<span>Missing token</span>}
      />
    );

    const image = screen.getByRole('img', { name: 'Token' });
    expect(image.getAttribute('width')).toBe('32');
    expect(image.getAttribute('height')).toBe('32');
    expect(image.getAttribute('loading')).toBe('lazy');
    expect(image.getAttribute('data-placeholder')).toBe('blur');
    expect(image.getAttribute('data-blur-data-url')).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(image.getAttribute('data-unoptimized')).toBe('false');
  });

  it('replaces a failed image and retries when the URL changes', () => {
    const { rerender } = render(
      <ImageWithFallback
        src="https://example.com/missing.png"
        alt="Token"
        width={32}
        height={32}
        fallback={<span>Missing token</span>}
      />
    );

    fireEvent.error(screen.getByRole('img', { name: 'Token' }));
    expect(screen.getByText('Missing token')).toBeTruthy();

    rerender(
      <ImageWithFallback
        src="https://example.com/replacement.png"
        alt="Token"
        width={32}
        height={32}
        fallback={<span>Missing token</span>}
      />
    );

    expect(
      screen.getByRole('img', { name: 'Token' }).getAttribute('data-unoptimized')
    ).toBe('true');
  });
});
