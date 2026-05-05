import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Delay before show — similar to Material Design tooltips */
const SHOW_DELAY_MS = 400;

/**
 * Google / Material–style helper tooltip: high-contrast grey surface, portal to body (no clipping).
 * @param {React.ReactNode} children — typically an icon button; wrapped in a measuring span
 * @param {React.ReactNode} content — string or JSX
 * @param {'top' | 'bottom' | 'left' | 'right'} [placement='top']
 */
export default function HelpTooltip({ children, content, placement = 'top' }) {
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState({ top: 0, left: 0, transform: 'translate(-50%, -100%)' });
  const showTimerRef = useRef(null);

  const updatePosition = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 10;
    if (placement === 'bottom') {
      setBox({
        top: r.bottom + margin,
        left: r.left + r.width / 2,
        transform: 'translate(-50%, 0)',
      });
    } else if (placement === 'left') {
      setBox({
        top: r.top + r.height / 2,
        left: r.left - margin,
        transform: 'translate(-100%, -50%)',
      });
    } else if (placement === 'right') {
      setBox({
        top: r.top + r.height / 2,
        left: r.right + margin,
        transform: 'translate(0, -50%)',
      });
    } else {
      setBox({
        top: r.top - margin,
        left: r.left + r.width / 2,
        transform: 'translate(-50%, -100%)',
      });
    }
  }, [placement]);

  const scheduleShow = useCallback(() => {
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    showTimerRef.current = window.setTimeout(() => {
      updatePosition();
      setOpen(true);
    }, SHOW_DELAY_MS);
  }, [updatePosition]);

  const hide = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    setOpen(false);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onMove = () => updatePosition();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, updatePosition]);

  const tooltip =
    open &&
    createPortal(
      <div
        role="tooltip"
        style={{
          position: 'fixed',
          zIndex: 99999,
          top: box.top,
          left: box.left,
          transform: box.transform,
          maxWidth: 'min(280px, calc(100vw - 24px))',
        }}
        className="rounded-lg px-3 py-2.5 text-[13px] leading-snug font-normal tracking-wide text-white bg-[#5f6368] shadow-[0_1px_3px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.18)] pointer-events-none"
      >
        {content}
      </div>,
      document.body,
    );

  return (
    <>
      <span
        ref={wrapRef}
        className="inline-flex items-center justify-center align-middle"
        onMouseEnter={scheduleShow}
        onMouseLeave={hide}
        onFocus={scheduleShow}
        onBlur={hide}
      >
        {children}
      </span>
      {tooltip}
    </>
  );
}
