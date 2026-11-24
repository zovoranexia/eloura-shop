// Unit tests for the pure helpers (no database / server needed):  npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, isMobile } from '../src/lib/phone';
import { formatUSD, parseUSD, centsToInput } from '../src/lib/money';
import { diliDay, diliDayStart, addDays, parseDiliLocal, toDiliLocalInput, formatDateTime } from '../src/lib/time';
import { loc, cleanI18n, translate } from '../src/lib/i18n-shared';
import { ALL_PERMISSIONS, SYSTEM_ROLES } from '../src/lib/rbac';
import { DILI_SUCOS, DILI_POSTS, MUNICIPALITY_KEYS } from '../src/lib/geo';

test('Timor-Leste phone numbers', () => {
  for (const ok of ['+670 7700 1234', '67077001234', '0067077001234', '7700 1234', '+670-7700-1234']) {
    const p = normalizePhone(ok);
    assert.ok(p.valid && p.type === 'mobile' && p.e164 === '+67077001234', ok);
  }
  const land = normalizePhone('331 1111');
  assert.ok(land.valid && land.type === 'landline' && land.e164 === '+6703311111');
  for (const bad of ['', '12345', '+62 812 3456 789', '8700 1234', '+670 77001', 'abc', '+670 7700 12345']) assert.equal(normalizePhone(bad).valid, false, bad);
  assert.equal(isMobile('+6703311111'), false);
  assert.equal(isMobile('77001234'), true);
});

test('USD money in integer cents', () => {
  assert.equal(formatUSD(2900), '$29.00');
  assert.equal(formatUSD(125050), '$1,250.50');
  assert.equal(formatUSD(0), '$0.00');
  assert.equal(parseUSD('12.5'), 1250);
  assert.equal(parseUSD('12,50'), 1250);
  assert.equal(parseUSD('abc'), null);
  assert.equal(parseUSD('-1'), null);
  assert.equal(centsToInput(1999), '19.99');
});

test('Asia/Dili is UTC+9 for day bucketing', () => {
  // 15:30 UTC on 24 Nov = 00:30 on 25 Nov in Dili
  assert.equal(diliDay('2026-11-24T15:30:00Z'), '2026-11-25');
  assert.equal(diliDay('2026-11-24T14:59:59Z'), '2026-11-24');
  assert.equal(diliDayStart('2026-11-25').toISOString(), '2026-11-24T15:00:00.000Z');
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  const d = parseDiliLocal('2026-11-24T10:30')!;
  assert.equal(d.toISOString(), '2026-11-24T01:30:00.000Z');
  assert.equal(toDiliLocalInput(d), '2026-11-24T10:30');
  assert.match(formatDateTime('2026-11-24T15:30:00Z', 'en'), /25/);
  assert.equal(parseDiliLocal('nonsense'), null);
});

test('i18n fallback: requested language -> Tetum -> English -> anything', () => {
  const v = { tet: 'Vestidu', en: 'Dress', pt: 'Vestido' };
  assert.equal(loc(v, 'pt'), 'Vestido');
  assert.equal(loc(v, 'id'), 'Vestidu'); // missing id -> tet
  assert.equal(loc({ en: 'Dress' }, 'id'), 'Dress');
  assert.equal(loc(null, 'tet'), '');
  assert.deepEqual(cleanI18n({ tet: ' a ', pt: '', xx: 'junk', en: 'b' }), { tet: 'a', en: 'b' });
  const dict = { a: { b: 'Hello {name}' } };
  assert.equal(translate(dict, {}, 'a.b', { name: 'Ana' }), 'Hello Ana');
  assert.equal(translate({}, { a: { b: 'fb' } }, 'a.b'), 'fb');
  assert.equal(translate({}, {}, 'missing.key'), 'missing.key');
});

test('RBAC catalogue is consistent', () => {
  const all = new Set(ALL_PERMISSIONS);
  assert.equal(all.size, ALL_PERMISSIONS.length, 'no duplicate permissions');
  for (const r of SYSTEM_ROLES) for (const p of r.permissions) assert.ok(all.has(p), `${r.key} -> unknown permission ${p}`);
  const keys = SYSTEM_ROLES.map((r) => r.key);
  assert.deepEqual(keys, ['SUPER_ADMIN', 'STORE_MANAGER', 'FINANCE_STAFF', 'ORDER_FULFILLMENT', 'CUSTOMER_SUPPORT', 'CUSTOMER']);
  assert.equal(SYSTEM_ROLES.find((r) => r.key === 'CUSTOMER')!.permissions.length, 0);
  const finance = SYSTEM_ROLES.find((r) => r.key === 'FINANCE_STAFF')!.permissions;
  assert.ok(finance.includes('payments.verify') && finance.includes('cod.reconcile') && !finance.includes('settings.manage'));
  const fulfil = SYSTEM_ROLES.find((r) => r.key === 'ORDER_FULFILLMENT')!.permissions;
  assert.ok(!fulfil.includes('payments.verify') && fulfil.includes('orders.assign_courier'));
});

test('Geography: Dili has 5 posts / 31 sucos and Atauro is separate', () => {
  assert.equal(DILI_POSTS.length, 5);
  assert.equal(Object.values(DILI_SUCOS).flat().length, 31);
  assert.ok(MUNICIPALITY_KEYS.includes('atauro') && MUNICIPALITY_KEYS.includes('oecusse'));
  assert.ok(!DILI_POSTS.some((p) => (p.key as string) === 'atauro'));
});
