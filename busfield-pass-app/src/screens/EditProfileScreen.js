import React, { useState } from 'react';
import Screen, { ScreenHeader } from '../components/Screen';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { ErrorBanner } from '../components/Feedback';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { isEmail } from '../utils/validation';
import { errorMessage } from '../utils/errors';

export default function EditProfileScreen({ navigation }) {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  async function save() {
    const e = {};
    if (name.trim().length < 2) e.name = 'Informe seu nome.';
    if (!isEmail(email)) e.email = 'Informe um e-mail válido.';
    setErrors(e);
    setApiError('');
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      const { user: updated } = await api.users.update({ name: name.trim(), email: email.trim() });
      setUser(updated);
      navigation.goBack();
    } catch (err) {
      setApiError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Editar informações" onBack={() => navigation.goBack()} />
      <ErrorBanner message={apiError} />
      <TextField label="Nome" value={name} onChangeText={setName} autoCapitalize="words" error={errors.name} style={{ marginTop: 4 }} />
      <TextField label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" error={errors.email} />
      <Button title="Salvar" onPress={save} loading={loading} testID="save-profile" style={{ marginTop: 24 }} />
    </Screen>
  );
}
