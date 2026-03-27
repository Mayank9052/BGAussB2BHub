import { useState, cloneElement } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  text: string;
  children: React.ReactElement<any>;
}

export default function Tooltip({ text, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleEnter = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();

    setPos({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8,
    });

    setVisible(true);
  };

  const handleLeave = () => setVisible(false);

  const child = children as React.ReactElement<any>;

  return (
    <>
      {cloneElement(child, {
        onMouseEnter: (e: any) => {
          handleEnter(e);
          child.props.onMouseEnter?.(e); // 🔥 preserve original
        },
        onMouseLeave: (e: any) => {
          handleLeave();
          child.props.onMouseLeave?.(e);
        },
      })}

      {visible &&
        createPortal(
          <div
            className="global-tooltip"
            style={{
            position: "fixed",
            left: pos.x,
            top: pos.y,
            transform: "translateX(-50%)",
            background: "#0f172a",
            color: "#fff",
            fontSize: "9.5px",
            fontWeight: 700,   // 🔥 BOLD
            padding: "3px 6px",
            borderRadius: "4px",
            lineHeight: "1",
            letterSpacing: "0.3px",
            zIndex: 999999,
            pointerEvents: "none",
            }}
          >
            {text}
          </div>,
          document.body
        )}
    </>
  );
}