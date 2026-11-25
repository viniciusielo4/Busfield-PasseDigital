import { Alert, Platform } from 'react-native';

// Alert.alert não funciona no navegador; nesse caso usamos window.confirm/alert.
export function confirmDialog({ title, message, confirmText = 'Confirmar', destructive = false, onConfirm }) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

export function infoDialog(title, message) {
  if (Platform.OS === 'web') { window.alert(`${title}\n\n${message}`); return; }
  Alert.alert(title, message);
}
