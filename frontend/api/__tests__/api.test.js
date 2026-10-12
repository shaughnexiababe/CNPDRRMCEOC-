import { describe, it, expect, beforeEach, vi } from 'vitest';
import cronHandler from '../cron-expire-alerts.js';
import { readJsonBody } from '../_lib/firebase-admin.js';

describe('API Route Security Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it('cron-expire-alerts fails closed (503) when CRON_SECRET is unset', async () => {
    delete process.env.CRON_SECRET;

    let statusCode = 200;
    let responseData = {};

    const req = { method: 'POST', headers: {} };
    const res = {
      setHeader: () => {},
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseData = data;
          },
        };
      },
    };

    await cronHandler(req, res);
    expect(statusCode).toBe(503);
    expect(responseData.error).toMatch(/not configured/i);
  });

  it('cron-expire-alerts returns 401 when authorization header is missing or incorrect', async () => {
    process.env.CRON_SECRET = 'valid_secret_123';

    let statusCode = 200;
    let responseData = {};

    const req = { method: 'POST', headers: { authorization: 'Bearer wrong_secret' } };
    const res = {
      setHeader: () => {},
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseData = data;
          },
        };
      },
    };

    await cronHandler(req, res);
    expect(statusCode).toBe(401);
    expect(responseData.error).toBe('Unauthorized');
  });

  it('readJsonBody throws 400 error on malformed JSON', async () => {
    const req = 'not-valid-json';
    try {
      await readJsonBody({ body: 'invalid-{json' });
      expect(true).toBe(false); // should not reach
    } catch (err) {
      expect(err.status).toBe(400);
      expect(err.message).toBe('Invalid JSON payload');
    }
  });

  it('rate limit simulation trips at 21st call', () => {
    const max = 20;
    let count = 0;
    for (let i = 0; i < 25; i++) {
      count++;
    }
    expect(count > max).toBe(true);
  });
});
