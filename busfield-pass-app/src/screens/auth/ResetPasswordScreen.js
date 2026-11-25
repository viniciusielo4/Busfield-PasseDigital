import React, { useState } from 'react';
import Screen, { ScreenHeader } from '../../components/Screen';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import { ErrorBanner } from '../../components/Feedback';
import { api } from '../../api';
import { passwordError } from '../../utils/validation';
import { errorMessage } from '../../utils/errors';
import { infoDialog } from '../../utils/dialog';

export default function ResetPasswordScreen({ navigation, route }) {
  const [token, setToken] = useState(route.params?.token ?? '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    const e = {};
    if (token.trim().length < 20) e.token = 'Informe o código de recuperação.';
    const pe = passwordError(password);
    if (pe) e.password = pe;
    setErrors(e);
    setApiError('');
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await api.auth.resetPassword(token.trim(), password);
      infoDialog('Senha redefinida', 'Agora você já pode entrar com a nova senha.');
      navigation.popToTop();
    } catch (err) {
      setApiError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Nova senha" onBack={() => navigation.goBack()} subtitle="Cole o código de recuperação e escolha uma nova senha." />
      <ErrorBanner message={apiError} />
      <TextField label="Código de recuperação" value={token} onChangeText={setToken} error={errors.token} style={{ marginTop: 4 }} />
      <TextField label="Nova senha" value={password} onChangeText={setPassword} secure error={errors.password} placeholder="Mínimo 8 caracteres" />
      <Button title="Redefinir senha" onPress={submit} loading={loading} style={{ marginTop: 24 }} />
    </Screen>
  );
}
