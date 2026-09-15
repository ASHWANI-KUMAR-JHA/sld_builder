import { useState, useRef, useCallback } from 'react';
import './ResizableSplit.css';

function ResizableSplit({ left, right }) {
  const [leftWidth, setLeftWidth] = useState(380);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = moveEvent.clientX - containerRect.left;
      // Clamp between 280 and 60% of container
      const maxWidth = containerRect.width * 0.6;
      const clamped = Math.max(280, Math.min(maxWidth, newWidth));
      setLeftWidth(clamped);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  return (
    <div className="resizable-split" ref={containerRef}>
      <div className="resizable-left" style={{ width: leftWidth }}>
        {left}
      </div>
      <div className="resizable-handle" onMouseDown={handleMouseDown}>
        <div className="handle-grip">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      <div className="resizable-right">
        {right}
      </div>
    </div>
  );
}

export default ResizableSplit;
