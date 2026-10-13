import { Form, Input, Modal, Typography } from 'antd';
import { useState } from 'react';
import { showApiError } from '../api/errors';
import { type Prescriber, type PrescriberInput, prescribersApi } from '../api/prescribers';

interface QuickCreatePrescriberModalProps {
  onClose: () => void;
  onCreated: (prescriber: Prescriber) => void;
}

/** Creates a prescriber from the prescription form and selects them at once. */
export function QuickCreatePrescriberModal({
  onClose,
  onCreated,
}: QuickCreatePrescriberModalProps) {
  const [form] = Form.useForm<PrescriberInput>();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(values: PrescriberInput) {
    setSaving(true);
    setFormError(null);
    try {
      onCreated(await prescribersApi.create(values));
    } catch (error) {
      // A duplicate licence arrives as a field error on `licenceNumber`.
      setFormError(showApiError(form, error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title="New prescriber"
      okText="Create prescriber"
      confirmLoading={saving}
      onOk={() => form.submit()}
      onCancel={onClose}
      forceRender
    >
      <Form form={form} layout="vertical" onFinish={submit} requiredMark>
        <Form.Item
          name="licenceNumber"
          label="Licence number"
          rules={[{ required: true, whitespace: true, message: 'Licence number is required.' }]}
        >
          <Input maxLength={50} />
        </Form.Item>
        <Form.Item
          name="fullName"
          label="Full name"
          rules={[{ required: true, whitespace: true, message: 'Full name is required.' }]}
        >
          <Input maxLength={200} />
        </Form.Item>
        <Form.Item name="clinicName" label="Clinic">
          <Input maxLength={200} />
        </Form.Item>
        {formError && <Typography.Text type="danger">{formError}</Typography.Text>}
      </Form>
    </Modal>
  );
}
