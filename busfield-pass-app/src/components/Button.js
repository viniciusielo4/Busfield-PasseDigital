import React from 'react';
import { Pressable, Text, ActivityIndicator } from 'react-native';
import { useTheme, radius, weight } from '../theme';

// variant: 'primary' (preenchido) | 'secondary' (suave) | 'danger' (suave, vermelho) | 'ghost' (só texto)
export default function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, style, testID }) {
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary },
    secondary: { bg: colors.primarySoft, fg: colors.primary },
    danger: { bg: colors.errorSoft, fg: colors.error },
    ghost: { bg: 'transparent', fg: colors.primary },
  }[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      testID={testID}
      onPress={inactive ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        {
          minHeight: variant === 'ghost' ? 44 : 54, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
          paddingHorizontal: 20, marginTop: 12, backgroundColor: palette.bg,
          opacity: inactive ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={palette.fg} /> : <Text style={{ color: palette.fg, fontSize: 16, fontWeight: weight.semibold }}>{title}</Text>}
    </Pressable>
  );
}
