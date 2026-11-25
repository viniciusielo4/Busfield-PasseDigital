import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { WalletProvider } from '../context/WalletContext';
import { useTheme } from '../theme';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { Loading } from '../components/Feedback';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import CardScreen from '../screens/CardScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RechargeScreen from '../screens/RechargeScreen';
import ReceiptScreen from '../screens/ReceiptScreen';
import EditProfileScreen from '../screens/EditProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: ['home', 'home-outline', 'Início'],
  Card: ['card', 'card-outline', 'Cartão'],
  History: ['time', 'time-outline', 'Histórico'],
  Profile: ['person', 'person-outline', 'Perfil'],
};

function Tabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, borderTopWidth: StyleSheet.hairlineWidth, elevation: 0, shadowOpacity: 0 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarLabel: TAB_ICONS[route.name][2],
        tabBarAccessibilityLabel: TAB_ICONS[route.name][2],
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={TAB_ICONS[route.name][focused ? 0 : 1]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Card" component={CardScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AppStack() {
  return (
    <WalletProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="Recharge" component={RechargeScreen} />
        <Stack.Screen name="Receipt" component={ReceiptScreen} options={{ gestureEnabled: true }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      </Stack.Navigator>
    </WalletProvider>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { status, restore } = useAuth();
  const { colors, isDark } = useTheme();
  const base = isDark ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, primary: colors.primary, background: colors.background, card: colors.surface, text: colors.text, border: colors.line } };

  if (status === 'loading') return <Screen scroll={false}><Loading /></Screen>;
  if (status === 'offline') {
    return (
      <Screen>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '600', marginTop: 40, letterSpacing: -0.4 }}>Sem conexão com o servidor</Text>
        <Text style={{ color: colors.textMuted, marginTop: 6 }}>Não foi possível restaurar sua sessão. Verifique a internet e o endereço da API.</Text>
        <Button title="Tentar novamente" onPress={restore} />
      </Screen>
    );
  }
  return (
    <NavigationContainer theme={theme}>
      {status === 'signedIn' ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
