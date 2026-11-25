import React, { useState } from 'react';
import { Text } from 'react-native';
import Screen, { ScreenHeader } from '../../components/Screen';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import Card from '../../components/Card';
import { ErrorBanner } from '../../components/Feedback';
import { api } from '../../api';
import { useTheme, font } from '../../theme';
import { isEmail } from '../../utils/validation';
import { errorMessage } from '../../utils/errors';

export default function ForgotPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(null); // { message, resetToken? }
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError('');
    if (!isEmail(email)) { setError('Informe um e-mail válido.'); return; }
    setLoading(true);
    try {
      setSent(await api.auth.forgotPassword(email.trim()));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Recuperar senha" onBack={() => navigation.goBack()} subtitle="Informe o e-mail da sua conta para receber as instruções de recuperação." />
      <ErrorBanner message={error} />
      <TextField label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" placeholder="voce@email.com" style={{ marginTop: 4 }} />
      <Button title="Enviar instruções" onPress={submit} loading={loading} style={{ marginTop: 24 }} />

      {sent ? (
        <Card style={{ marginTop: 20 }}>
          <Text style={{ color: colors.text, fontSize: font.body, lineHeight: 21 }}>{sent.message}</Text>
          {/* Só aparece quando o backend está em modo de desenvolvimento (ainda não há envio de e-mail). */}
          {sent.resetToken ? (
            <Button title="Modo desenvolvimento: usar o código agora" variant="secondary" onPress={() => navigation.navigate('ResetPassword', { token: sent.resetToken })} />
          ) : null}
          <Button title="Já tenho um código" variant="ghost" onPress={() => navigation.navigate('ResetPassword')} />
        </Card>
      ) : null}
    </Screen>
  );
}
