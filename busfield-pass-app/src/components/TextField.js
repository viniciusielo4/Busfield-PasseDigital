import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, radius, font, weight } from '../theme';

// Campo preenchido, sem borda por padrão; borda azul no foco e vermelha no erro.
export default function TextField({ label, error, secure = false, style, ...props }) {
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(secure);
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.error : focused ? colors.primary : 'transparent';
  return (
    <View style={[{ marginTop: 16 }, style]}>
      <Text style={{ color: colors.textMuted, fontSize: font.small, fontWeight: weight.medium, marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1.5, borderColor }}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textMuted}
          style={[{ flex: 1, minHeight: 52, paddingHorizontal: 16, fontSize: 16, color: colors.text }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]}
          secureTextEntry={hidden}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} accessibilityRole="button" accessibilityLabel={hidden ? 'Mostrar senha' : 'Ocultar senha'} hitSlop={8} style={{ paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' }}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={{ color: colors.error, fontSize: font.caption, marginTop: 6 }}>{error}</Text> : null}
    </View>
  );
}
