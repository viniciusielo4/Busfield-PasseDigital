import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import IconCircle from './IconCircle';
import { useTheme, font, weight } from '../theme';

// Linha de lista: ícone opcional, título/subtítulo, valor à direita e seta; divisória fina entre linhas.
export default function ListRow({ icon, tone, title, subtitle, value, valueColor, onPress, chevron, last, titleColor, testID, accessibilityLabel }) {
  const { colors } = useTheme();
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      testID={testID}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingVertical: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line }}
    >
      {icon ? <View style={{ marginRight: 12 }}><IconCircle name={icon} tone={tone} /></View> : null}
      <View style={{ flex: 1 }}>
        <Text style={{ color: titleColor || colors.text, fontSize: font.body, fontWeight: weight.medium }}>{title}</Text>
        {subtitle ? <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 1 }}>{subtitle}</Text> : null}
      </View>
      {value !== undefined ? <Text style={{ color: valueColor || colors.text, fontSize: font.body, fontWeight: weight.semibold, marginLeft: 12 }}>{value}</Text> : null}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ marginLeft: 6 }} /> : null}
    </Wrapper>
  );
}
