import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { useTheme, weight } from '../theme';

// Controle segmentado (filtros): trilho suave com o item selecionado em destaque.
export default function Segmented({ items, value, onChange }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 14, padding: 4 }}>
      {items.map((it) => {
        const selected = it.key === value;
        return (
          <Pressable
            key={String(it.key)} onPress={() => onChange(it.key)} accessibilityRole="button" accessibilityLabel={it.label} accessibilityState={{ selected }}
            style={{ flex: 1, minHeight: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.primary : 'transparent' }}
          >
            <Text style={{ color: selected ? colors.onPrimary : colors.textMuted, fontWeight: selected ? weight.semibold : weight.medium, fontSize: 14 }}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
