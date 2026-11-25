import React, { useState } from 'react';
import { View, Text } from 'react-native';
import Screen from '../../components/Screen';
import Brand from '../../components/Brand';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import { ErrorBanner } from '../../components/Feedback';
import { useAuth } from '../../context/AuthContext';
import { useTheme, font, weight } from '../../theme';
import { isEmail } from '../../utils/validation';
import { errorMessage } from '../../utils/errors';

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    const e = {};
    if (!isEmail(email)) e.email = 'Informe um e-mail válido.';
    if (!password) e.password = 'Informe sua senha.';
    setErrors(e);
    setApiError('');
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await signIn(email, password); // ao concluir, o navegador troca para a área logada
    } catch (err) {
      setApiError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={{ marginTop: 20 }}><Brand /></View>

      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 30, fontWeight: weight.semibold, letterSpacing: -0.8, marginTop: 48 }}>Bem-vindo de volta</Text>
      <Text style={{ color: colors.textMuted, fontSize: font.body, marginTop: 6, lineHeight: 21 }}>Entre para ver seu saldo e gerenciar seu cartão de transporte.</Text>

      <ErrorBanner message={apiError} />
      <TextField label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" error={errors.email} placeholder="voce@email.com" />
      <TextField label="Senha" value={password} onChangeText={setPassword} secure autoComplete="password" textContentType="password" error={errors.password} />

      <View style={{ alignItems: 'flex-end', marginTop: 4 }}>
        <Button title="Esqueci minha senha" variant="ghost" onPress={() => navigation.navigate('ForgotPassword')} style={{ marginTop: 0 }} />
      </View>

      <Button title="Entrar" onPress={submit} loading={loading} testID="login-submit" style={{ marginTop: 8 }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, gap: 2 }}>
        <Text style={{ color: colors.textMuted, fontSize: font.body }}>Ainda não tem conta?</Text>
        <Button title="Criar conta" variant="ghost" onPress={() => navigation.navigate('Register')} style={{ marginTop: 0, paddingHorizontal: 8 }} />
      </View>
    </Screen>
  );
}
