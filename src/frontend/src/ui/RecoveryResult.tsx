import { Button, Result } from 'antd';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { palette } from './theme';

const ICONS = {
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4M12 15v2" />
    </>
  ),
  notFound: (
    <>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5M14 3l5 5h-5zM8 9h3M8 13h3" />
      <circle cx="16.5" cy="16.5" r="3" />
      <path d="m18.7 18.7 2.3 2.3" />
    </>
  ),
  noScreens: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a7 7 0 0 1 11-5.7M17 17h5" />
    </>
  ),
};

export type ResultIconName = keyof typeof ICONS;

/** A line icon in its teal tile; replaces Ant Design's default illustrations. */
export function ResultIcon({ name }: { name: ResultIconName }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 72,
        height: 72,
        borderRadius: 16,
        // White, not a pale teal: the content area behind it is grey.
        background: '#fff',
        color: palette.brand800,
      }}
    >
      <svg
        width={34}
        height={34}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        {ICONS[name]}
      </svg>
    </span>
  );
}

/**
 * A screen that says what went wrong and how to get back (brand.md A9). The
 * code ("403", "404") sits small above the title.
 */
export function RecoveryResult({
  icon,
  code,
  title,
  text,
  action,
}: {
  icon: ResultIconName;
  code?: string;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <Result
      icon={<ResultIcon name={icon} />}
      title={
        <>
          {code && (
            <div style={{ fontSize: 12, fontWeight: 600, color: palette.textTertiary, marginBottom: 4 }}>
              {code}
            </div>
          )}
          {/* The page's heading, at the Result title's size. */}
          <h1 style={{ margin: 0, font: 'inherit', color: 'inherit' }}>{title}</h1>
        </>
      }
      subTitle={text}
      extra={action}
    />
  );
}

/**
 * One control, not a link inside a button: a click anywhere on it leads to
 * the start page.
 */
export function StartPageButton() {
  const navigate = useNavigate();
  return (
    <Button type="primary" onClick={() => navigate('/')}>
      Go to your start page
    </Button>
  );
}
