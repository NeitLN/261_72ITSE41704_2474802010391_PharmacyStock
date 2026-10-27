import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Grid, Input, Typography } from 'antd';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { showApiError } from '../api/errors';
import { canOpen } from '../auth/access';
import { useAuth } from '../auth/authContext';
import { BrandLogo } from '../ui/BrandLogo';
import { palette } from '../ui/theme';

interface LoginForm {
  username: string;
  password: string;
}

/** Rules the server enforces, nothing more: no figures, no testimonials (brand.md A8). */
const PRINCIPLES = [
  'Stock balances trace back to recorded movements.',
  'Only sellable stock from active, unexpired batches is issued.',
  'Dispensing never exceeds the quantity prescribed.',
];

const rule = '1px solid rgba(255, 255, 255, 0.22)';

/** UC16 sign-in. Errors appear next to their field or above the form (NFR-04). */
export function LoginPage() {
  const { user, signIn, can } = useAuth();
  const [form] = Form.useForm<LoginForm>();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  // `lg` is unknown until the first measurement; the app targets 1280 px, so
  // assume the wide layout rather than flash the narrow one.
  const showPanel = Grid.useBreakpoint().lg ?? true;
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';

  // Back to where the session ended, if this user's role may open it.
  if (user) return <Navigate to={canOpen(from, can) ? from : '/'} replace />;

  const submit = async ({ username, password }: LoginForm) => {
    setError(null);
    setSubmitting(true);
    try {
      const signedIn = await signIn(username, password);
      const allowed = canOpen(from, (p) => signedIn.permissions.includes(p));
      navigate(allowed ? from : '/', { replace: true });
    } catch (e) {
      setError(showApiError(form, e));
      form.setFieldValue('password', '');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: showPanel ? '520px 1fr' : '1fr',
        background: '#fff',
      }}
    >
      {showPanel && (
        <aside
          style={{
            background: palette.brand800,
            color: '#fff',
            padding: '64px 56px 40px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <BrandLogo variant="signin" />
          <div style={{ marginTop: 64 }}>
            {PRINCIPLES.map((text, i) => (
              <p
                key={text}
                style={{
                  margin: 0,
                  padding: '16px 0',
                  fontSize: 16,
                  lineHeight: 1.5,
                  borderTop: rule,
                  borderBottom: i === PRINCIPLES.length - 1 ? rule : undefined,
                }}
              >
                {text}
              </p>
            ))}
          </div>
          <p style={{ marginTop: 'auto', marginBottom: 0, fontSize: 12, color: palette.brand100 }}>
            Course project · Van Lang University · 72ITSE41704
          </p>
        </aside>
      )}
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          {!showPanel && (
            <div style={{ marginBottom: 32 }}>
              <BrandLogo variant="light" />
            </div>
          )}
          <Typography.Title level={1} style={{ marginTop: 0, marginBottom: 4, fontSize: 24 }}>
            Sign in
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
            Use the account your manager set up for you.
          </Typography.Paragraph>
          {error && (
            <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />
          )}
          <Form<LoginForm>
            form={form}
            layout="vertical"
            onFinish={submit}
            requiredMark={false}
            initialValues={{ username: '', password: '' }}
          >
            <Form.Item
              label="Username"
              name="username"
              rules={[{ required: true, whitespace: true, message: 'Enter your username.' }]}
            >
              <Input size="large" prefix={<UserOutlined />} autoComplete="username" autoFocus />
            </Form.Item>
            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: 'Enter your password.' }]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                autoComplete="current-password"
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
              Sign in
            </Button>
          </Form>
          <Typography.Paragraph
            type="secondary"
            style={{ textAlign: 'center', fontSize: 13, marginTop: 18, marginBottom: 0 }}
          >
            Need access? Ask the manager.
          </Typography.Paragraph>
        </div>
      </main>
    </div>
  );
}
