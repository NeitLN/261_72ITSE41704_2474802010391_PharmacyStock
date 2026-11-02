import { InputNumber, type InputNumberProps } from 'antd';
import { useCallback, useState } from 'react';
import { formatMoneyInput } from './moneyFormat';
import { parseGroupedNumber } from './numberRules';

/**
 * A whole-money field: plain digits while editing, `100.000` once left
 * (#244). The formatter keeps one identity per state, because InputNumber
 * re-formats the field whenever it receives a new formatter.
 */
export function MoneyInput(props: InputNumberProps<number>) {
  const { onFocus, onBlur, ...rest } = props;
  const [editing, setEditing] = useState(false);
  const formatter = useCallback<NonNullable<InputNumberProps<number>['formatter']>>(
    (value, info) => formatMoneyInput(value, info, editing),
    [editing],
  );
  return (
    <InputNumber<number>
      {...rest}
      formatter={formatter}
      parser={parseGroupedNumber}
      onFocus={(e) => {
        setEditing(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setEditing(false);
        onBlur?.(e);
      }}
    />
  );
}
