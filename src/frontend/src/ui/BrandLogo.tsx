import { palette } from './theme';

/**
 * The large drawing of the LotOrder mark (docs/design/brand.md A2): two lots
 * waiting and the next one out. Only for 32 px and up; the browser tab uses
 * the favicon drawing in public/favicon.svg.
 */
export function BrandMark({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flex: 'none' }}
    >
      <path d="M8 4H17L21 6L17 8H8A1 1 0 0 1 7 7V5A1 1 0 0 1 8 4Z" />
      <rect x="3" y="10" width="14" height="4" rx="1" />
      <rect x="3" y="16" width="14" height="4" rx="1" />
    </svg>
  );
}

/** Sizes in px of each lockup (brand.md A3). */
const LOCKUPS = {
  header: { mark: 32, name: 24, gap: 10, descriptor: 0, onTeal: true },
  signin: { mark: 56, name: 40, gap: 14, descriptor: 15, onTeal: true },
  light: { mark: 48, name: 28, gap: 14, descriptor: 13, onTeal: false },
};

export type BrandLogoVariant = keyof typeof LOCKUPS;

/** The mark, "LotOrder" and, where it is readable, the descriptor. */
export function BrandLogo({ variant }: { variant: BrandLogoVariant }) {
  const l = LOCKUPS[variant];
  const ink = l.onTeal ? '#fff' : palette.brand800;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: l.gap }}>
      <BrandMark size={l.mark} color={ink} />
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span
          style={{
            color: ink,
            fontSize: l.name,
            fontWeight: 800,
            letterSpacing: '-0.025em',
            lineHeight: 1.1,
          }}
        >
          LotOrder
        </span>
        {l.descriptor > 0 && (
          <span
            style={{
              color: l.onTeal ? palette.brand100 : palette.textSecondary,
              fontSize: l.descriptor,
              fontWeight: 500,
              lineHeight: 1.4,
              marginTop: 4,
            }}
          >
            Pharmacy Stock &amp; Prescription Dispensing
          </span>
        )}
      </span>
    </span>
  );
}
