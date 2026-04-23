"use client";

import { useEffect, useState } from "react";

import { useRewriteStrip } from "@/components/editor/extensions/RewriteStrip/controller";

function unionRects(rects: DOMRect[]) {
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));

  return new DOMRect(left - 12, top - 12, right - left + 24, bottom - top + 24);
}

export function SpotlightOverlay({ intensity = 75 }: { intensity?: number }) {
  const { session } = useRewriteStrip();
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!session) {
      setRect(null);
      return;
    }

    const currentSession = session;

    function updateRect() {
      const activeNodes = Array.from(
        document.querySelectorAll<HTMLElement>(".rewrite-strip-active"),
      )
        .filter((node) => node.offsetParent !== null)
        .map((node) => node.getBoundingClientRect());

      setRect(activeNodes.length ? unionRects(activeNodes) : currentSession.rect);
    }

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [session]);

  if (!session || !rect) {
    return null;
  }

  const opacity = Math.min(Math.max(intensity, 0), 100) / 100;
  const panelClass =
    "pointer-events-none fixed z-40 bg-bg transition-opacity duration-200 backdrop-blur-[1px]";

  return (
    <>
      <div
        className={panelClass}
        style={{
          left: 0,
          top: 0,
          width: "100vw",
          height: rect.top,
          opacity,
        }}
      />
      <div
        className={panelClass}
        style={{
          left: 0,
          top: rect.bottom,
          width: "100vw",
          height: `calc(100vh - ${rect.bottom}px)`,
          opacity,
        }}
      />
      <div
        className={panelClass}
        style={{
          left: 0,
          top: rect.top,
          width: rect.left,
          height: rect.height,
          opacity,
        }}
      />
      <div
        className={panelClass}
        style={{
          left: rect.right,
          top: rect.top,
          width: `calc(100vw - ${rect.right}px)`,
          height: rect.height,
          opacity,
        }}
      />
    </>
  );
}
