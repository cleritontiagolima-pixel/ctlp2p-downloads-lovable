import { useEffect, useRef } from "react";

// TV remote support: arrow keys move focus between [data-nav] elements by screen
// position; OK/Enter clicks; Back keys (Samsung 10009, LG 461, Android 4, Esc) go back.
const backStack: Array<{ current: () => void }> = [];

export function useBack(fn: () => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    backStack.push(ref);
    return () => { backStack.splice(backStack.indexOf(ref), 1); };
  }, []);
}

const DIRS: Record<string, "up" | "down" | "left" | "right"> = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
};

export function isBackKey(e: KeyboardEvent, typing: boolean) {
  return ["Escape", "GoBack", "BrowserBack"].includes(e.key) || [10009, 461, 4].includes(e.keyCode) || (e.key === "Backspace" && !typing);
}

export function moveFocus(dir: "up" | "down" | "left" | "right") {
  const els = Array.from(document.querySelectorAll<HTMLElement>("[data-nav]")).filter((el) => el.getClientRects().length > 0);
  const cur = document.activeElement as HTMLElement | null;
  if (!cur || !els.includes(cur)) { els[0]?.focus(); return; }
  const a = cur.getBoundingClientRect();
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best: HTMLElement | undefined;
  let bestScore = Infinity;
  for (const el of els) {
    if (el === cur) continue;
    const b = el.getBoundingClientRect();
    const dx = b.left + b.width / 2 - ax, dy = b.top + b.height / 2 - ay;
    const vertical = dir === "up" || dir === "down";
    const ok = dir === "up" ? dy < -2 : dir === "down" ? dy > 2 : dir === "left" ? dx < -2 : dx > 2;
    if (!ok) continue;
    const score = vertical ? Math.abs(dy) + Math.abs(dx) * 3 : Math.abs(dx) + Math.abs(dy) * 3;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (best) { best.focus(); best.scrollIntoView({ block: "nearest", inline: "nearest" }); }
}

export function useRemoteNavigation() {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.tagName === "INPUT";
      if (isBackKey(e, typing)) {
        const top = backStack[backStack.length - 1];
        if (top) { e.preventDefault(); top.current(); }
        return;
      }
      const dir = DIRS[e.key];
      if (!dir || (typing && (dir === "left" || dir === "right"))) return;
      e.preventDefault();
      moveFocus(dir);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
}

export function focusFirst(selector = "[data-nav]") {
  requestAnimationFrame(() => document.querySelector<HTMLElement>(selector)?.focus());
}
