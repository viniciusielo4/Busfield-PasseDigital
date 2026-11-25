import React from 'react';
import { Text, View } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import ListRow from '../components/ListRow';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { useTheme, font, weight } from '../theme';
import { confirmDialog } from '../utils/dialog';

export default function ProfileScreen({ navigation }) {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const { wallet } = useWallet();

  function confirmSignOut() {
    confirmDialog({
      title: 'Sair da conta?', message: 'Você precisará entrar novamente para acessar seu cartão.',
      confirmText: 'Sair', destructive: true, onConfirm: signOut,
    });
  }

  return (
    <Screen tab>
      <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 28 }}>
        <Avatar name={user?.name} size={80} />
        <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 22, fontWeight: weight.semibold, marginTop: 14, letterSpacing: -0.3 }}>{user?.name}</Text>
        <Text style={{ color: colors.textMuted, fontSize: font.body, marginTop: 2 }}>{user?.email}</Text>
      </View>

      <Card style={{ paddingVertical: 4 }}>
        <ListRow icon="person-outline" title="Editar informações pessoais" chevron onPress={() => navigation.navigate('EditProfile')} />
        <ListRow icon="card-outline" title="Cartão" value={wallet?.cardNumber ?? '—'} last />
      </Card>

      <Card style={{ paddingVertical: 4, marginTop: 4 }}>
        <ListRow testID="sign-out" icon="log-out-outline" tone="error" title="Sair" titleColor={colors.error} onPress={confirmSignOut} last />
      </Card>

      <Text style={{ color: colors.textMuted, fontSize: font.caption, textAlign: 'center', marginTop: 24 }}>BusField Pass · versão de demonstração</Text>
    </Screen>
  );
}
