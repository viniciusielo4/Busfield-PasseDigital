import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ApiError } from '../src/api/client';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-crypto', () => { let n = 0; return { randomUUID: jest.fn(() => `uuid-${++n}`) }; });
jest.mock('../src/api', () => ({
  api: { recharge: jest.fn(), payFare: jest.fn(), cards: { block: jest.fn(), unblock: jest.fn() } },
  tokenStorage: {}, setSessionExpiredHandler: jest.fn(),
}));

const mockSignIn = jest.fn();
jest.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ signIn: mockSignIn, user: { name: 'Vinicius Teste' } }) }));
let mockWallet;
const mockRefresh = jest.fn().mockResolvedValue(null);
jest.mock('../src/context/WalletContext', () => ({ useWallet: () => ({ wallet: mockWallet, refresh: mockRefresh, loading: false }) }));

const { api } = require('../src/api');
const LoginScreen = require('../src/screens/auth/LoginScreen').default;
const RechargeScreen = require('../src/screens/RechargeScreen').default;
const CardScreen = require('../src/screens/CardScreen').default;
const PassCard = require('../src/components/PassCard').default;
const TransactionRow = require('../src/components/TransactionRow').default;

const activeWallet = { cardNumber: 'BF-0042-7731', status: 'active', balanceCents: 2450, fareCents: 450, minRechargeCents: 500, maxRechargeCents: 50000 };
const nav = () => ({ navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), popToTop: jest.fn() });

beforeEach(() => { jest.clearAllMocks(); mockWallet = { ...activeWallet }; });

describe('LoginScreen', () => {
  test('valida os campos antes de chamar a API', async () => {
    const user = userEvent.setup();
    await render(<LoginScreen navigation={nav()} />);
    await user.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.getByText('Informe um e-mail válido.')).toBeTruthy();
    expect(screen.getByText('Informe sua senha.')).toBeTruthy();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  test('envia as credenciais e mostra o erro vindo da API', async () => {
    mockSignIn.mockRejectedValueOnce(new ApiError({ status: 401, code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha incorretos.' }));
    const user = userEvent.setup();
    await render(<LoginScreen navigation={nav()} />);
    await user.type(screen.getByLabelText('E-mail'), 'vini@exemplo.com');
    await user.type(screen.getByLabelText('Senha'), 'senhaSegura1');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(mockSignIn).toHaveBeenCalledWith('vini@exemplo.com', 'senhaSegura1');
    expect(await screen.findByText('E-mail ou senha incorretos.')).toBeTruthy();
  });

  test('links levam para cadastro e recuperação de senha', async () => {
    const navigation = nav();
    const user = userEvent.setup();
    await render(<LoginScreen navigation={navigation} />);
    await user.press(screen.getByRole('button', { name: 'Criar conta' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Register');
    await user.press(screen.getByRole('button', { name: 'Esqueci minha senha' }));
    expect(navigation.navigate).toHaveBeenCalledWith('ForgotPassword');
  });
});

describe('RechargeScreen', () => {
  test('recarga com valor rápido envia centavos + Idempotency-Key e abre o comprovante', async () => {
    api.recharge.mockResolvedValueOnce({ transaction: { id: 'tx-1' }, replayed: false });
    const navigation = nav();
    const user = userEvent.setup();
    await render(<RechargeScreen navigation={navigation} />);
    await user.press(screen.getByRole('button', { name: 'R$ 30,00' }));
    expect(screen.getByText('R$ 54,50')).toBeTruthy(); // saldo após a recarga: 24,50 + 30,00
    await user.press(screen.getByRole('button', { name: 'Confirmar recarga' }));
    expect(api.recharge).toHaveBeenCalledWith(3000, expect.stringMatching(/^uuid-/));
    expect(mockRefresh).toHaveBeenCalled();
    expect(navigation.replace).toHaveBeenCalledWith('Receipt', { transactionId: 'tx-1', justConfirmed: true });
  });

  test('valor personalizado abaixo do mínimo mostra erro e bloqueia o botão', async () => {
    const user = userEvent.setup();
    await render(<RechargeScreen navigation={nav()} />);
    await user.type(screen.getByLabelText('Outro valor (R$)'), '1,00');
    expect(screen.getByText('A recarga mínima é R$ 5,00.')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Confirmar recarga' }));
    expect(api.recharge).not.toHaveBeenCalled();
  });

  test('valor acima do máximo é recusado', async () => {
    const user = userEvent.setup();
    await render(<RechargeScreen navigation={nav()} />);
    await user.type(screen.getByLabelText('Outro valor (R$)'), '600');
    expect(screen.getByText('A recarga máxima é R$ 500,00.')).toBeTruthy();
  });

  test('cartão bloqueado impede a recarga', async () => {
    mockWallet = { ...activeWallet, status: 'blocked' };
    const user = userEvent.setup();
    await render(<RechargeScreen navigation={nav()} />);
    expect(screen.getByText(/Cartão bloqueado/)).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Confirmar recarga' }));
    expect(api.recharge).not.toHaveBeenCalled();
  });

  test('queda de rede: a nova tentativa reutiliza a MESMA chave (sem recarga duplicada)', async () => {
    api.recharge
      .mockRejectedValueOnce(new ApiError({ code: 'NETWORK_ERROR', message: 'Sem conexão.' }))
      .mockResolvedValueOnce({ transaction: { id: 'tx-2' }, replayed: false });
    const user = userEvent.setup();
    await render(<RechargeScreen navigation={nav()} />);
    await user.press(screen.getByRole('button', { name: 'Confirmar recarga' }));
    expect(await screen.findByText('Sem conexão.')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Confirmar recarga' }));
    const [first, second] = api.recharge.mock.calls;
    expect(second[1]).toBe(first[1]);
  });

  test('erro definitivo (422): a nova tentativa usa uma chave NOVA', async () => {
    api.recharge
      .mockRejectedValueOnce(new ApiError({ status: 422, code: 'CARD_BLOCKED', message: 'Cartão bloqueado.' }))
      .mockResolvedValueOnce({ transaction: { id: 'tx-3' }, replayed: false });
    const user = userEvent.setup();
    await render(<RechargeScreen navigation={nav()} />);
    await user.press(screen.getByRole('button', { name: 'Confirmar recarga' }));
    await screen.findByText('Cartão bloqueado.');
    await user.press(screen.getByRole('button', { name: 'Confirmar recarga' }));
    const [first, second] = api.recharge.mock.calls;
    expect(second[1]).not.toBe(first[1]);
  });
});

describe('CardScreen', () => {
  test('mostra saldo e dados do cartão', async () => {
    await render(<CardScreen navigation={nav()} />);
    expect(screen.getAllByText('R$ 24,50').length).toBeGreaterThan(0);
    expect(screen.getAllByText('BF-0042-7731').length).toBeGreaterThan(0);
    expect(screen.getByText('R$ 4,50')).toBeTruthy();
  });

  test('simular passagem mostra o novo saldo', async () => {
    api.payFare.mockResolvedValueOnce({ transaction: { amountCents: 450, balanceAfterCents: 2000 }, replayed: false });
    const user = userEvent.setup();
    await render(<CardScreen navigation={nav()} />);
    await user.press(screen.getByTestId('simulate-fare'));
    expect(api.payFare).toHaveBeenCalledWith(expect.stringMatching(/^uuid-/));
    expect(await screen.findByText(/Passagem validada: R\$ 4,50 debitados\. Novo saldo: R\$ 20,00\./)).toBeTruthy();
  });

  test('saldo insuficiente oferece recarregar', async () => {
    api.payFare.mockRejectedValueOnce(new ApiError({ status: 422, code: 'INSUFFICIENT_BALANCE', message: 'Saldo insuficiente para a tarifa.' }));
    const navigation = nav();
    const user = userEvent.setup();
    await render(<CardScreen navigation={navigation} />);
    await user.press(screen.getByTestId('simulate-fare'));
    expect(await screen.findByText('Saldo insuficiente para a tarifa.')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Recarregar agora' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Recharge');
  });

  test('desbloquear cartão chama a API e atualiza a carteira', async () => {
    mockWallet = { ...activeWallet, status: 'blocked' };
    api.cards.unblock.mockResolvedValueOnce({});
    const user = userEvent.setup();
    await render(<CardScreen navigation={nav()} />);
    await user.press(screen.getByTestId('toggle-block'));
    expect(api.cards.unblock).toHaveBeenCalled();
    expect(mockRefresh).toHaveBeenCalled();
  });
});

describe('componentes', () => {
  test('PassCard mostra número e status em texto (ativo e bloqueado)', async () => {
    await render(<PassCard wallet={activeWallet} holderName="Vinicius Teste" />);
    expect(screen.getByText('Ativo')).toBeTruthy();
    expect(screen.getByText('BF-0042-7731')).toBeTruthy();
    expect(screen.getByText('Vinicius Teste')).toBeTruthy();
    await render(<PassCard wallet={{ ...activeWallet, status: 'blocked' }} />);
    expect(screen.getByText('Bloqueado')).toBeTruthy();
  });

  test('TransactionRow usa sinal + para recarga e − para pagamento', async () => {
    const now = new Date().toISOString();
    await render(<><TransactionRow tx={{ id: '1', type: 'recharge', amountCents: 3000, description: 'Recarga simulada', createdAt: now }} />
      <TransactionRow tx={{ id: '2', type: 'payment', amountCents: 450, description: 'Passagem (simulada)', createdAt: now }} /></>);
    expect(screen.getByText('+ R$ 30,00')).toBeTruthy();
    expect(screen.getByText('− R$ 4,50')).toBeTruthy();
  });
});
