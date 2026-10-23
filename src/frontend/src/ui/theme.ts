import type { ThemeConfig } from 'antd';

/**
 * The one place the app's look is set (ui-design.md §5, design v3). Every
 * text colour on white is at least 4.5:1 and every control border at least
 * 3:1; Ant Design's own defaults for errors (#ff4d4f), links (#1677ff) and
 * secondary text fall short of that, so they are replaced here.
 */
export const palette = {
  brand800: '#0a5c50',
  brand700: '#0b6b5d',
  brand600: '#0d7d6c',
  brand100: '#cfe8e2',
  brand50: '#eaf5f2',
  ground: '#ebf0ee',
  border: '#dde5e2',
  controlBorder: '#869691',
  text: '#13201c',
  textSecondary: '#44524d',
  textTertiary: '#5b6964',
  success: '#1f7a3a',
  successBg: '#e8f5ec',
  warning: '#8f5200',
  warningBg: '#fdf3dc',
  danger: '#b42318',
  dangerBg: '#fdeceb',
  info: '#1d5fb8',
  infoBg: '#e9f1fc',
  quarantine: '#6941c6',
  quarantineBg: '#f2effc',
  neutral: '#44524d',
  neutralBg: '#edf1f0',
} as const;

const controlBorders = {
  colorBorder: palette.controlBorder,
  hoverBorderColor: palette.brand700,
  activeBorderColor: palette.brand600,
};

export const theme: ThemeConfig = {
  token: {
    fontFamily: "'Be Vietnam Pro', 'Segoe UI', system-ui, -apple-system, sans-serif",
    fontSize: 14,
    fontSizeHeading1: 32,
    fontSizeHeading2: 24,
    fontSizeHeading3: 20,
    fontSizeHeading4: 16,
    fontWeightStrong: 600,
    colorPrimary: palette.brand600,
    colorPrimaryHover: palette.brand700,
    colorPrimaryActive: palette.brand800,
    colorPrimaryBg: palette.brand50,
    colorPrimaryBgHover: palette.brand100,
    colorLink: palette.brand700,
    colorLinkHover: palette.brand800,
    colorSuccess: palette.success,
    colorWarning: palette.warning,
    colorError: palette.danger,
    colorInfo: palette.info,
    colorText: palette.text,
    colorTextSecondary: palette.textSecondary,
    colorTextTertiary: palette.textTertiary,
    colorTextDescription: palette.textTertiary,
    colorTextPlaceholder: '#66756f',
    colorBgLayout: palette.ground,
    colorBorder: '#c9d3d0',
    colorBorderSecondary: palette.border,
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,
    controlHeight: 32,
    controlHeightLG: 40,
    boxShadowTertiary: `0 1px 2px rgba(16, 36, 31, 0.06), 0 0 0 1px ${palette.border}`,
    boxShadowSecondary: '0 4px 12px rgba(16, 36, 31, 0.10), 0 1px 3px rgba(16, 36, 31, 0.06)',
    lineWidthFocus: 2,
  },
  components: {
    Layout: { headerBg: palette.brand800, bodyBg: palette.ground },
    Menu: {
      itemSelectedBg: palette.brand50,
      itemSelectedColor: palette.brand800,
      itemHoverBg: palette.ground,
      itemBorderRadius: 6,
    },
    Table: {
      headerBg: '#f6f8f7',
      headerColor: palette.textTertiary,
      rowHoverBg: '#f6f9f8',
      rowSelectedBg: '#f3faf8',
    },
    Tabs: {
      inkBarColor: palette.brand600,
      itemSelectedColor: palette.brand800,
      itemHoverColor: palette.brand700,
    },
    Button: { fontWeight: 500 },
    Input: controlBorders,
    InputNumber: controlBorders,
    Select: { ...controlBorders, optionSelectedBg: palette.brand50 },
    DatePicker: controlBorders,
    Checkbox: { colorBorder: palette.controlBorder },
    Radio: { colorBorder: palette.controlBorder },
  },
};
