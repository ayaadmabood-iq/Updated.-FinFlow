import { useCursorSync, UserCursor } from '@/hooks/useRealtimeCollaboration';
import { useEffect, useRef } from 'react';

interface CursorOverlayProps {
  resourceType: string;
  resourceId: string;
  containerRef?: React.RefObject<HTMLElement>;
}

function CursorDisplay({ cursor }: { cursor: UserCursor }) {
  if (!cursor.position) return null;

  return (
    <div
      className="pointer-events-none absolute z-50 transition-all duration-75"
      style={{
        left: cursor.position.x,
        top: cursor.position.y,
        transform: 'translate(-2px, -2px)',
      }}
    >
      {/* Cursor pointer */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        style={{ color: cursor.color }}
      >
        <path
          d="M5.65376 12.4563L6.29346 18.9819C6.40316 20.0973 7.87485 20.4848 8.52435 19.5905L11.0025 16.1857L15.7107 19.8776C16.6274 20.5873 17.9496 20.0389 18.1268 18.9021L20.4764 4.35356C20.6777 3.05249 19.3283 2.01657 18.1445 2.55781L3.46915 9.29644C2.10237 9.92174 2.26437 11.8991 3.71194 12.2901L5.65376 12.4563Z"
          fill="currentColor"
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      
      {/* User label */}
      <div
        className="absolute left-4 top-4 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap shadow-md"
        style={{ backgroundColor: cursor.color }}
      >
        {cursor.userName || 'User'}
      </div>
    </div>
  );
}

export function CursorOverlay({ resourceType, resourceId, containerRef }: CursorOverlayProps) {
  const { cursors, updateCursor } = useCursorSync(resourceType, resourceId);
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const container = containerRef?.current || document.body;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      // Throttle updates - only send if moved more than 5px
      if (
        !lastPositionRef.current ||
        Math.abs(position.x - lastPositionRef.current.x) > 5 ||
        Math.abs(position.y - lastPositionRef.current.y) > 5
      ) {
        lastPositionRef.current = position;
        updateCursor(position);
      }
    };

    const handleMouseLeave = () => {
      lastPositionRef.current = null;
      updateCursor(null);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [containerRef, updateCursor]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {cursors.map((cursor) => (
        <CursorDisplay key={cursor.userId} cursor={cursor} />
      ))}
    </div>
  );
}
