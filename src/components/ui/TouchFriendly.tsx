import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Touch-friendly button with larger tap target (minimum 44x44px)
 */
export function TouchButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        // Minimum touch target size (44x44px)
        'min-h-[44px] min-w-[44px]',
        'px-4 py-2',
        'rounded-lg',
        'active:scale-95 transition-transform',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Swipeable card component
 */
export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  className,
}: {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
}) {
  const [touchStart, setTouchStart] = React.useState(0);
  const [touchEnd, setTouchEnd] = React.useState(0);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={cn('touch-pan-y', className)}
    >
      {children}
    </div>
  );
}
