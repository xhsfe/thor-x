export interface TabItemType {
  name?: string
  image?: string
  activeImage?: string
  value: string
  badgeProps?: any
  labelNumber?: number
}

export const enum TabLabelType {
  leftIcon = 'leftIcon',
  rightIcon = 'rightIcon',
  digit = 'digit',
}
export const enum TabSizeType {
  small = 'small',
  normal = 'normal',
  large = 'large',
}

export const enum TabThemeType {
  underline = 'underline',
  text = 'text',
}

export const enum TabLayoutType {
  left = 'left',
  middle = 'middle',
  space = 'space',
}
export interface Tab {
  theme?: TabThemeType
  size?: TabSizeType
  labelType?: TabLabelType
  layout?: TabLayoutType
  badge?: boolean
  containerStyle?: any
  onChange?: (value: string, index: number) => any
  spaceWidth?: number
  tabPadding?: number
  active?: string
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TabEvent {}
export const TabDefaultProps = {
  theme: TabThemeType.underline,
  size: TabSizeType.normal,
  labelType: TabLabelType.leftIcon,
  layout: TabLayoutType.left,
  badge: false,
  spaceWidth: 12,
  tabPadding: 24,
  active: '',
}

export interface TabChild {
  name?: string
  image?: string
  activeImage?: string
  value: string
  labelNumber?: number
}
export interface Tabs {
  theme?: TabThemeType
  size?: TabSizeType
  labelType?: TabLabelType
  layout?: TabLayoutType
  badge?: boolean
  containerStyle?: any
  onChange?: (value: string, index: number) => any
  spaceWidth?: number
  tabPadding?: number
  active?: string
}

export const TabsDefaultProps = {
  theme: TabThemeType.underline,
  size: TabSizeType.normal,
  labelType: TabLabelType.leftIcon,
  layout: TabLayoutType.space,
  badge: false,
  spaceWidth: 12,
  tabPadding: 24,
  active: '',
}
