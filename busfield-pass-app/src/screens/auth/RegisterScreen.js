import React, { useState } from 'react';
import Screen, { ScreenHeader } from '../../components/Screen';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import { ErrorBanner } from '../../components/Feedback';
import { useAuth } from '../../context/AuthContext';
import { isEmail, passwordError } from '../../utils/validation';
import { errorMessage } from '../../utils/errors';

export default function RegisterScreen({ navigation }) {
  const { signUp } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Informe seu nome.';
    if (!isEmail(form.email)) e.email = 'Informe um e-mail válido.';
    const pe = passwordError(form.password);
    if (pe) e.password = pe;
    if (form.confirm !== form.password) e.confirm = 'As senhas não conferem.';
    setErrors(e);
    setApiError('');
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await signUp({ name: form.name, email: form.email, password: form.password });
    } catch (err) {
      setApiError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader
        title="Criar conta" onBack={() => navigation.goBack()}
        subtitle="Pedimos apenas os dados necessários (LGPD). Seu cartão digital é criado automaticamente."
      />
      <ErrorBanner message={apiError} />
      <TextField label="Nome" value={form.name} onChangeText={set('name')} autoCapitalize="words" autoComplete="name" error={errors.name} style={{ marginTop: 4 }} />
      <TextField label="E-mail" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoComplete="email" error={errors.email} placeholder="voce@email.com" />
      <TextField label="Senha" value={form.password} onChangeText={set('password')} secure error={errors.password} placeholder="Mínimo 8 caracteres" />
      <TextField label="Confirmar senha" value={form.confirm} onChangeText={set('confirm')} secure error={errors.confirm} />
      <Button title="Cadastrar e criar cartão digital" onPress={submit} loading={loading} testID="register-submit" style={{ marginTop: 24 }} />
    </Screen>
  );
}
