import { Space } from 'antd';
import type { ReactNode } from 'react';

/**
 * The bar above every list: search and filters on the left, the one primary
 * action on the right, the same on every tab.
 */
export function ListToolbar({ children, action }: { children?: ReactNode; action?: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Space wrap>{children}</Space>
      {action}
    </div>
  );
}

/** A switch with its words, one label, so clicking the words flips it too. */
export function LabelledSwitch({ children }: { children: ReactNode }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
      {children}
    </label>
  );
}
