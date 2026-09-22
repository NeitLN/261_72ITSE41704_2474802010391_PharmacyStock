import { Card, List, Typography } from 'antd';

interface PlaceholderPageProps {
  title: string;
  owner: string;
  useCases: string[];
}

/**
 * Temporary stand-in for a feature area that has not been built yet.
 * Each page states which use cases it will cover and who owns them, so the
 * week 1 scaffold shows the planned scope without claiming working features.
 */
export function PlaceholderPage({
  title,
  owner,
  useCases,
}: PlaceholderPageProps) {
  return (
    <Card>
      <Typography.Title level={3}>{title}</Typography.Title>
      <Typography.Paragraph type="secondary">
        Owner: {owner}. Not implemented yet — this screen is a week 1
        placeholder.
      </Typography.Paragraph>
      <List
        header={<strong>Planned use cases</strong>}
        bordered
        dataSource={useCases}
        renderItem={(item) => <List.Item>{item}</List.Item>}
      />
    </Card>
  );
}
