import { type ReactNode, useEffect, useRef } from 'react';

const HEADING = 'h1, h2, h3, h4, h5, .ant-descriptions-title, .ant-typography strong';

/**
 * Wraps the panel that shows a stock change (receipt, hand-over recorded,
 * return slip). It fades in rising 8 px when motion is allowed, and moves the
 * focus to its heading so a keyboard or screen-reader user lands on the
 * result (ui-design §5.1).
 */
export function ResultAppear({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The first heading that is on screen: the print-only heading comes first but is hidden.
    const visible = [...(ref.current?.querySelectorAll<HTMLElement>(HEADING) ?? [])].find(
      (el) => el.offsetParent !== null,
    );
    const heading = visible ?? ref.current;
    if (!heading) return;
    heading.setAttribute('tabindex', '-1');
    heading.focus();
  }, []);

  return (
    <div ref={ref} className="result-appear">
      {children}
    </div>
  );
}
