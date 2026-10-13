import { Form, Input, Modal, Typography } from 'antd';
import { useState } from 'react';
import { showApiError } from '../api/errors';
import { type Customer, type CustomerInput, customersApi } from '../api/customers';

interface QuickCreateCustomerModalProps {
  onClose: () => void;
  onCreated: (customer: Customer) => void;
}

/** Creates a patient from the prescription form and selects them at once. */
export function QuickCreateCustomerModal({ onClose, onCreated }: QuickCreateCustomerModalProps) {
  const [form] = Form.useForm<CustomerInput>();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(values: CustomerInput) {
    setSaving(true);
    setFormError(null);
    try {
      onCreated(await customersApi.create(values));
    } catch (error) {
      setFormError(showApiError(form, error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title="New patient"
      okText="Create patient"
      confirmLoading={saving}
      onOk={() => form.submit()}
      onCancel={onClose}
      forceRender
    >
      <Form form={form} layout="vertical" onFinish={submit} requiredMark>
        <Form.Item
          name="fullName"
          label="Full name"
          rules={[{ required: true, whitespace: true, message: 'Full name is required.' }]}
        >
          <Input maxLength={200} />
        </Form.Item>
        <Form.Item name="phone" label="Phone number">
          <Input maxLength={30} placeholder="e.g. 0909 123 456" />
        </Form.Item>
        <Form.Item name="dateOfBirth" label="Date of birth">
          <Input type="date" />
        </Form.Item>
        <Form.Item name="address" label="Address">
          <Input maxLength={300} />
        </Form.Item>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Address and date of birth (or age on the prescription) are required to
          dispense (DEC-03).
        </Typography.Paragraph>
        {formError && <Typography.Text type="danger">{formError}</Typography.Text>}
      </Form>
    </Modal>
  );
}
