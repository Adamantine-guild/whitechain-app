import {
  ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
}

export default function Tooltip({
  content,
  children,
  side = "top",
}: TooltipProps) {
  const id = useId();

  const triggerRef = useRef<HTMLSpanElement>(null);

  const [visible, setVisible] = useState(false);

  const [position, setPosition] = useState({
    top: 0,
    left: 0,
  });

  const updatePosition = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();

    const GAP = 10;

    const top =
      side === "top"
        ? rect.top - GAP
        : rect.bottom + GAP;

    setPosition({
      top,
      left: rect.left + rect.width / 2,
    });
  };

  useEffect(() => {
    if (!visible) return;

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={0}
        aria-describedby={id}
        className="inline-flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 rounded"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
      >
        {children}
      </span>

      {visible && (
        <div
          id={id}
          role="tooltip"
          className="fixed z-[9999] max-w-xs rounded-md bg-slate-900 px-3 py-2 text-xs leading-relaxed text-white shadow-xl border border-slate-700 pointer-events-none"
          style={{
            left: position.left,
            top: position.top,
            transform:
              side === "top"
                ? "translate(-50%, -100%)"
                : "translate(-50%, 0)",
          }}
        >
          {content}
        </div>
      )}
    </>
  );
}
