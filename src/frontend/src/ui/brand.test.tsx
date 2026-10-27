import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { Me } from '../api/me';
import App from '../App';
import { AuthContext } from '../auth/authContext';
import { RequireScreen, StartPage } from '../auth/guards';
import { MainLayout } from '../layouts/MainLayout';
import { LoginPage } from '../pages/LoginPage';
import { BrandLogo } from './BrandLogo';

// The identity of docs/design/brand.md, checked on the HTML each screen renders.

function render(ui: ReactNode, { user, permissions = [], path = '/' }: {
  user?: Me | null;
  permissions?: string[];
  path?: string;
} = {}) {
  const signedIn = user === undefined ? manager(permissions) : user;
  return renderToStaticMarkup(
    <AuthContext.Provider
      value={{
        user: signedIn,
        signedOutByUser: false,
        signIn: async () => manager(permissions),
        signOut: async () => {},
        can: (p) => permissions.includes(p),
      }}
    >
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </AuthContext.Provider>,
  );
}

function manager(permissions: string[]): Me {
  return { id: 'u1', username: 'manager', fullName: 'Sample Manager', role: 'MANAGER', permissions };
}

describe('BrandLogo (A3)', () => {
  it('the header lockup is the mark and the name, without the descriptor', () => {
    const html = renderToStaticMarkup(<BrandLogo variant="header" />);
    expect(html).toContain('>LotOrder<');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('Prescription Dispensing');
  });

  it('the sign-in lockup adds the descriptor', () => {
    const html = renderToStaticMarkup(<BrandLogo variant="signin" />);
    expect(html).toContain('Pharmacy Stock &amp; Prescription Dispensing');
  });
});

describe('header (B1 #7)', () => {
  it('shows the lockup as a link to the start page and the role as a pill, not a cyan tag', () => {
    const html = render(<MainLayout />, { permissions: ['stock.view'] });
    const link = html.match(/<a [^>]*aria-label="LotOrder, go to your start page"[^>]*>/)?.[0];
    expect(link).toContain('href="/"');
    expect(html).toContain('Sample Manager');
    expect(html).toContain('>Manager<');
    expect(html).not.toContain('ant-tag-cyan');
  });
});

describe('sign-in (A8)', () => {
  it('shows the three server-enforced statements, an h1 and large controls', () => {
    const html = render(<LoginPage />, { user: null, path: '/login' });
    expect(html).toContain('Stock balances trace back to recorded movements.');
    expect(html).toContain('Only sellable stock from active, unexpired batches is issued.');
    expect(html).toContain('Dispensing never exceeds the quantity prescribed.');
    expect(html).toContain('Course project · Van Lang University · 72ITSE41704');
    expect(html).toContain('Use the account your manager set up for you.');
    expect(html).toContain('Need access? Ask the manager.');
    expect(html).toContain('ant-input-lg');
    expect(html).toContain('ant-btn-lg');
    expect(html).toMatch(/<h1[^>]*>Sign in<\/h1>/);
  });
});

describe('recovery screens (A9)', () => {
  it('403 says to ask the manager and offers one start-page button (where it leads: TC-65)', () => {
    const html = render(<RequireScreen path="/reports">secret</RequireScreen>, { permissions: ['sale.create'] });
    expect(html).not.toContain('secret');
    expect(html).toContain('403');
    expect(html).toMatch(/<h1[^>]*>No access<\/h1>/);
    expect(html).toContain('Your role cannot use this screen. Ask the manager if you need access.');
    expect(html).toContain('Go to your start page');
    // One control: no link nested inside the button.
    expect(html).not.toMatch(/<button[^>]*>(?:(?!<\/button>).)*<a /s);
  });

  it('no screens has no button, so it cannot loop back to itself', () => {
    const html = render(<StartPage />, { permissions: [] });
    expect(html).toContain('No screens yet');
    expect(html).toContain('Your role has no permissions yet. Ask the manager.');
    expect(html).not.toContain('ant-btn');
  });

  it('an unknown address shows Page not found to a signed-in user', () => {
    const html = render(<App />, { permissions: ['stock.view'], path: '/nothing-here' });
    expect(html).toContain('404');
    expect(html).toContain('Page not found');
    expect(html).toContain('This address does not match a screen. Check it, or go to your start page.');
  });

  it('an unknown address does not show the 404 to a signed-out user (the redirect to sign-in: TC-65)', () => {
    const html = render(<App />, { user: null, path: '/nothing-here' });
    expect(html).not.toContain('Page not found');
  });
});
