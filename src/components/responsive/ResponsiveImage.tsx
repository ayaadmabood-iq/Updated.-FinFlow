import React, { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Responsive image with automatic sizing and lazy loading
 *
 * @example
 * ```tsx
 * <ResponsiveImage
 *   src="/image.jpg"
 *   alt="Description"
 *   aspectRatio="16/9"
 *   priority
 * />
 * ```
 */
export interface ResponsiveImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  aspectRatio?: '1/1' | '4/3' | '16/9' | '21/9' | string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  sizes?: string;
  srcSet?: string;
}

export function ResponsiveImage({
  src,
  alt,
  aspectRatio,
  objectFit = 'cover',
  priority = false,
  placeholder = 'empty',
  className,
  sizes,
  srcSet,
  ...props
}: ResponsiveImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted',
        aspectRatio && `aspect-[${aspectRatio}]`,
        className
      )}
    >
      {!loaded && !error && placeholder === 'blur' && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}

      {error ? (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <span className="text-sm">Failed to load image</span>
        </div>
      ) : (
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          className={cn(
            'w-full h-full transition-opacity duration-300',
            objectFit === 'cover' && 'object-cover',
            objectFit === 'contain' && 'object-contain',
            objectFit === 'fill' && 'object-fill',
            objectFit === 'none' && 'object-none',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          {...props}
        />
      )}
    </div>
  );
}

/**
 * Responsive picture element with multiple sources for different screens
 *
 * @example
 * ```tsx
 * <ResponsivePicture
 *   sources={[
 *     { srcSet: '/image-mobile.jpg', media: '(max-width: 640px)' },
 *     { srcSet: '/image-tablet.jpg', media: '(max-width: 1024px)' },
 *     { srcSet: '/image-desktop.jpg' }
 *   ]}
 *   alt="Responsive image"
 * />
 * ```
 */
export interface ResponsivePictureProps {
  sources: Array<{
    srcSet: string;
    media?: string;
    type?: string;
  }>;
  fallback: string;
  alt: string;
  aspectRatio?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  className?: string;
}

export function ResponsivePicture({
  sources,
  fallback,
  alt,
  aspectRatio,
  objectFit = 'cover',
  className,
}: ResponsivePictureProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden',
        aspectRatio && `aspect-[${aspectRatio}]`,
        className
      )}
    >
      <picture>
        {sources.map((source, index) => (
          <source
            key={index}
            srcSet={source.srcSet}
            media={source.media}
            type={source.type}
          />
        ))}
        <img
          src={fallback}
          alt={alt}
          className={cn(
            'w-full h-full',
            objectFit === 'cover' && 'object-cover',
            objectFit === 'contain' && 'object-contain',
            objectFit === 'fill' && 'object-fill'
          )}
          loading="lazy"
        />
      </picture>
    </div>
  );
}

/**
 * Avatar with responsive sizing
 */
export interface ResponsiveAvatarProps {
  src?: string;
  alt: string;
  fallback?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function ResponsiveAvatar({
  src,
  alt,
  fallback,
  size = 'md',
  className,
}: ResponsiveAvatarProps) {
  const [error, setError] = useState(false);

  const sizeClasses = {
    xs: 'h-8 w-8 text-xs',
    sm: 'h-10 w-10 text-sm',
    md: 'h-12 w-12 text-base',
    lg: 'h-16 w-16 text-lg',
    xl: 'h-20 w-20 text-xl',
  }[size];

  const initials = fallback || alt.substring(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden bg-primary/10',
        'flex items-center justify-center',
        sizeClasses,
        className
      )}
    >
      {src && !error ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      ) : (
        <span className="font-semibold text-primary">{initials}</span>
      )}
    </div>
  );
}

/**
 * Image gallery with responsive grid
 */
export interface ResponsiveGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    caption?: string;
  }>;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  gap?: number;
  aspectRatio?: string;
  onImageClick?: (index: number) => void;
  className?: string;
}

export function ResponsiveGallery({
  images,
  cols = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = 4,
  aspectRatio = '4/3',
  onImageClick,
  className,
}: ResponsiveGalleryProps) {
  const gridCols = cn(
    cols.xs && `grid-cols-${cols.xs}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`
  );

  return (
    <div className={cn('grid', gridCols, `gap-${gap}`, className)}>
      {images.map((image, index) => (
        <div
          key={index}
          onClick={() => onImageClick?.(index)}
          className={cn(
            'group cursor-pointer overflow-hidden rounded-lg',
            onImageClick && 'hover:opacity-90 transition-opacity'
          )}
        >
          <ResponsiveImage
            src={image.src}
            alt={image.alt}
            aspectRatio={aspectRatio}
            className="w-full"
          />
          {image.caption && (
            <p className="mt-2 text-sm text-muted-foreground">
              {image.caption}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
