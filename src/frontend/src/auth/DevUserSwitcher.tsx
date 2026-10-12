import { Select, Space, Tag, Tooltip } from 'antd';
import { DEV_USERS, type DevUsername, getDevUser, setDevUser } from './devUser';

/**
 * TEMPORARY until the login page (UC16, issue #44): choose which sample
 * account the UI acts as. Changing it reloads the page so every screen
 * fetches again as the new user.
 */
export function DevUserSwitcher() {
  return (
    <Space>
      <Tooltip title="Development only: no sign-in yet. The API trusts this choice.">
        <Tag color="orange">Dev user</Tag>
      </Tooltip>
      <Select<DevUsername>
        value={getDevUser()}
        options={DEV_USERS.map((u) => ({ value: u.username, label: u.label }))}
        onChange={(username) => {
          setDevUser(username);
          window.location.reload();
        }}
        style={{ width: 140 }}
        aria-label="Act as user"
      />
    </Space>
  );
}
