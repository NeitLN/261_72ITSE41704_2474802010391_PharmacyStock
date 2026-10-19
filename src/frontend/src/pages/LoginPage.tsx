import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { showApiError } from '../api/errors';
import { canOpen } from '../auth/access';
import { useAuth } from '../auth/authContext';

interface LoginForm {
  username: string;
  password: string;
}

/** UC16 sign-in. Errors appear next to their field or above the form (NFR-04). */
export function LoginPage() {
  const { user, signIn, can } = useAuth();
  const [form] = Form.useForm<LoginForm>();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: '#f0f2f5',
      }}
    >
      <Card style={{ width: '100%', maxWidth: 380 }}>
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          Sign in
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          Pharmacy Stock &amp; Prescription Dispensing
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
            <Input prefix={<UserOutlined />} autoComplete="username" autoFocus />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Enter your password.' }]}
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>
            Sign in
          </Button>
        </Form>
      </Card>
    </div>
  );
}
