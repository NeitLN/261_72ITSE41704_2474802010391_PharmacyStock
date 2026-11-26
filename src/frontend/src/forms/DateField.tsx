import { DatePicker } from 'antd';
import dayjs from 'dayjs';

const FORMAT = 'YYYY-MM-DD';

/**
 * A date field that always shows and returns `YYYY-MM-DD`, whatever the
 * browser's locale (a native date input showed mm/dd/yyyy and swapped day and
 * month). The form value stays a plain string, as the API expects. `min` and
 * `max` grey out days outside the range; the rules still check them.
 */
export function DateField({
  value,
  onChange,
  min,
  max,
  id,
  style,
  ...rest
}: {
  value?: string | null;
  onChange?: (value: string | null) => void;
  min?: string;
  max?: string;
  id?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
  disabled?: boolean;
  status?: 'error' | 'warning';
}) {
  return (
    <DatePicker
      {...rest}
      id={id}
      format={FORMAT}
      placeholder={FORMAT}
      value={value ? dayjs(value, FORMAT) : null}
      onChange={(d) => onChange?.(d ? d.format(FORMAT) : null)}
      disabledDate={(d) => {
        const day = d.format(FORMAT);
        return (min !== undefined && day < min) || (max !== undefined && day > max);
      }}
      style={{ width: 160, ...style }}
    />
  );
}
