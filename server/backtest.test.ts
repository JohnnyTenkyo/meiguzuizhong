import { describe, it, expect, beforeAll } from 'vitest';

const BASE = 'http://localhost:3000';

// Helper to register/login and get token
async function getAuthToken(): Promise<string> {
  const username = 'testuser_bt_' + Date.now();
  const password = 'testpass123';
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  return data.token;
}

describe('Auth API', () => {
  it('should register a new user', async () => {
    const username = 'reg_test_' + Date.now();
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'pass1234' }),
    });
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.token).toBeDefined();
    expect(data.user).toBeDefined();
    expect(data.user.name).toBe(username);
  });

  it('should login with correct credentials', async () => {
    const username = 'login_test_' + Date.now();
    // Register first
    await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'pass1234' }),
    });
    // Login
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'pass1234' }),
    });
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.token).toBeDefined();
  });

  it('should reject wrong password', async () => {
    const username = 'wrong_pass_' + Date.now();
    await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'pass1234' }),
    });
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'wrongpass' }),
    });
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('should change password', async () => {
    const username = 'chgpass_' + Date.now();
    const regRes = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'oldpass123' }),
    });
    const { token } = await regRes.json();

    const res = await fetch(`${BASE}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ oldPassword: 'oldpass123', newPassword: 'newpass456' }),
    });
    const data = await res.json();
    expect(data.success).toBe(true);

    // Login with new password
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'newpass456' }),
    });
    const loginData = await loginRes.json();
    expect(loginData.success).toBe(true);
  });
});

describe('Backtest API', () => {
  let token: string;
  let sessionId: number;

  beforeAll(async () => {
    token = await getAuthToken();
  });

  it('should create a backtest session', async () => {
    const res = await fetch(`${BASE}/api/backtest/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: '测试回测',
        initialBalance: 100000,
        startDate: 20240101,
      }),
    });
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.session).toBeDefined();
    expect(data.session.name).toBe('测试回测');
    expect(Number(data.session.initialBalance)).toBe(100000);
    expect(data.session.startDate).toBe(20240101);
    sessionId = data.session.id;
  });

  it('should list backtest sessions', async () => {
    const res = await fetch(`${BASE}/api/backtest/sessions`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.sessions)).toBe(true);
    expect(data.sessions.length).toBeGreaterThan(0);
  });

  it('should get session detail', async () => {
    const res = await fetch(`${BASE}/api/backtest/sessions/${sessionId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.session.id).toBe(sessionId);
  });

  it('should execute a buy trade', async () => {
    const res = await fetch(`${BASE}/api/backtest/sessions/${sessionId}/trade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        symbol: 'AAPL',
        type: 'buy',
        quantity: 10,
        price: 185.50,
      }),
    });
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Number(data.session.currentBalance)).toBeLessThan(100000);
    expect(data.positions.length).toBe(1);
    expect(data.positions[0].symbol).toBe('AAPL');
    expect(data.positions[0].quantity).toBe(10);
  });

  it('should execute a sell trade', async () => {
    const res = await fetch(`${BASE}/api/backtest/sessions/${sessionId}/trade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        symbol: 'AAPL',
        type: 'sell',
        quantity: 5,
        price: 190.00,
      }),
    });
    const data = await res.json();
    expect(data.success).toBe(true);
    // Should have 5 shares left
    const aaplPos = data.positions.find((p: any) => p.symbol === 'AAPL');
    expect(aaplPos.quantity).toBe(5);
  });

  it('should reject selling more than held', async () => {
    const res = await fetch(`${BASE}/api/backtest/sessions/${sessionId}/trade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        symbol: 'AAPL',
        type: 'sell',
        quantity: 100,
        price: 190.00,
      }),
    });
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('should advance date via PATCH', async () => {
    const res = await fetch(`${BASE}/api/backtest/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ currentDate: 20240102 }),
    });
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.session.currentDate).toBe(20240102);
  });

  it('should require auth for backtest endpoints', async () => {
    const res = await fetch(`${BASE}/api/backtest/sessions`);
    expect(res.status).toBe(401);
  });
});
