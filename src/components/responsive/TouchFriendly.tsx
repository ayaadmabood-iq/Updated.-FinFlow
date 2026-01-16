import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

/**
 * Touch-friendly button with larger tap target (minimum 44x44px)
 * Provides visual feedback on touch
 *
 * @example
 * ```tsx
 * <TouchButton onClick={() => console.log('clicked')}>
 *   Click Me
 * </TouchButton>
 * ```
 */
export interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'destructive';
}

export function TouchButton({
  children,
  className,
  size = 'md',
  variant = 'default',
  disabled,
  ...props
}: TouchButtonProps) {
  const sizeClasses = {
    sm: 'min-h-[44px] min-w-[44px] px-3 py-2 text-sm',
    md: 'min-h-[44px] min-w-[44px] px-4 py-2',
    lg: 'min-h-[48px] min-w-[48px] px-6 py-3 text-lg',
  }[size];

  const variantClasses = {
    default: 'bg-background text-foreground border border-input hover:bg-accent',
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  }[variant];

  return (
    <button
      className={cn(
        // Base styles
        'inline-flex items-center justify-center',
        'rounded-lg font-medium',
        'transition-all duration-150',
        // Touch feedback
        'active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        // Size and variant
        sizeClasses,
        variantClasses,
        // Disabled state
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Swipeable card component for touch interactions
 * Supports left and right swipe gestures
 *
 * @example
 * ```tsx
 * <SwipeableCard
 *   onSwipeLeft={() => console.log('Swiped left')}
 *   onSwipeRight={() => console.log('Swiped right')}
 * >
 *   <CardContent />
 * </SwipeableCard>
 * ```
 */
export interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  swipeThreshold?: number;
  className?: string;
  disabled?: boolean;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  swipeThreshold = 50,
  className,
  disabled = false,
}: SwipeableCardProps) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (disabled) return;
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchEnd = () => {
    if (disabled || !touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;

    // Determine if swipe was primarily horizontal or vertical
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

    if (isHorizontalSwipe) {
      const isLeftSwipe = distanceX > swipeThreshold;
      const isRightSwipe = distanceX < -swipeThreshold;

      if (isLeftSwipe && onSwipeLeft) {
        onSwipeLeft();
      } else if (isRightSwipe && onSwipeRight) {
        onSwipeRight();
      }
    } else {
      const isUpSwipe = distanceY > swipeThreshold;
      const isDownSwipe = distanceY < -swipeThreshold;

      if (isUpSwipe && onSwipeUp) {
        onSwipeUp();
      } else if (isDownSwipe && onSwipeDown) {
        onSwipeDown();
      }
    }

    setIsDragging(false);
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={cn(
        'touch-pan-y select-none',
        isDragging && 'transition-transform',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Pull to refresh component
 * Common mobile pattern for refreshing content
 *
 * @example
 * ```tsx
 * <PullToRefresh onRefresh={async () => {
 *   await fetchNewData();
 * }}>
 *   <ContentList />
 * </PullToRefresh>
 * ```
 */
export interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  disabled = false,
}: PullToRefreshProps) {
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;

    const container = containerRef.current;
    if (container && container.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || isRefreshing || startY === 0) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;

    if (distance > 0) {
      setPullDistance(Math.min(distance, threshold * 1.5));
    }
  };

  const handleTouchEnd = async () => {
    if (disabled || isRefreshing) return;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    setStartY(0);
    setPullDistance(0);
  };

  const pullProgress = Math.min(pullDistance / threshold, 1);

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all"
          style={{ height: `${pullDistance}px` }}
        >
          <div
            className={cn(
              'w-8 h-8 rounded-full border-2 border-primary',
              isRefreshing ? 'animate-spin border-t-transparent' : ''
            )}
            style={{
              transform: `scale(${pullProgress})`,
              opacity: pullProgress,
            }}
          />
        </div>
      )}

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? 'transform 0.2s' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Long press button - triggers action after holding
 *
 * @example
 * ```tsx
 * <LongPressButton
 *   onLongPress={() => console.log('Long pressed!')}
 *   duration={500}
 * >
 *   Hold me
 * </LongPressButton>
 * ```
 */
export interface LongPressButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onLongPress: () => void;
  duration?: number;
  showProgress?: boolean;
}

export function LongPressButton({
  children,
  onLongPress,
  duration = 500,
  showProgress = true,
  className,
  ...props
}: LongPressButtonProps) {
  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();
  const progressRef = useRef<NodeJS.Timeout>();

  const startPress = () => {
    setPressing(true);
    setProgress(0);

    // Update progress
    if (showProgress) {
      const startTime = Date.now();
      progressRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setProgress(Math.min((elapsed / duration) * 100, 100));
      }, 16); // ~60fps
    }

    // Trigger action after duration
    timerRef.current = setTimeout(() => {
      onLongPress();
      endPress();
    }, duration);
  };

  const endPress = () => {
    setPressing(false);
    setProgress(0);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
  };

  return (
    <button
      className={cn(
        'relative overflow-hidden',
        'min-h-touch-target min-w-touch-target',
        'px-4 py-2 rounded-lg',
        'bg-primary text-primary-foreground',
        'active:scale-95 transition-transform',
        className
      )}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      {...props}
    >
      {showProgress && pressing && (
        <div
          className="absolute inset-0 bg-primary-foreground/20"
          style={{ width: `${progress}%`, transition: 'width 16ms linear' }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

/**
 * Tap feedback wrapper - adds visual feedback to any element
 *
 * @example
 * ```tsx
 * <TapFeedback>
 *   <div>Tap me for feedback</div>
 * </TapFeedback>
 * ```
 */
export function TapFeedback({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [isTapping, setIsTapping] = useState(false);

  return (
    <div
      className={cn(
        'transition-transform duration-150',
        isTapping && 'scale-95',
        className
      )}
      onTouchStart={() => setIsTapping(true)}
      onTouchEnd={() => setIsTapping(false)}
      onMouseDown={() => setIsTapping(true)}
      onMouseUp={() => setIsTapping(false)}
      onMouseLeave={() => setIsTapping(false)}
    >
      {children}
    </div>
  );
}
