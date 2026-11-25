import { useColorScheme } from 'react-native';
import { light, dark } from './colors';

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
export const radius = { sm: 12, md: 16, lg: 20, xl: 24, pill: 999 };
export const font = { display: 40, title: 26, h2: 17, body: 15, small: 13, caption: 12 };
export const weight = { regular: '400', medium: '500', semibold: '600' };

// Tema claro/escuro automático, seguindo a configuração do aparelho.
export function useTheme() {
  const scheme = useColorScheme();
  return { colors: scheme === 'dark' ? dark : light, isDark: scheme === 'dark' };
}
