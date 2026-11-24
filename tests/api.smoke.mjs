// End-to-end API smoke test against a running dev/prod server (seeded database).
// Usage: node --env-file=.env tests/api.smoke.mjs [baseUrl]    (default http://localhost:3000; server must run with TRUST_PROXY=1)
const BASE = process.argv[2] || 'http://localhost:3000';
const PW = process.env.SEED_DEMO_PASSWORD || 'Demo#Eloura2026';

let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '  ✔' : '  ✘'} ${name}${cond ? '' : '  ' + extra}`); };

// Needs the server under test to run with TRUST_PROXY=1: every client gets its own X-Forwarded-For address, so the per-IP rate
// limits (checkout, login...) never interfere between clients or between repeated runs.
const randomIp = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;

class Client {
  jar = new Map();
  ip = randomIp();
  async req(method, path, { body, form, headers = {}, raw } = {}) {
    const h = { 'x-forwarded-for': this.ip, ...headers };
    if (this.jar.size) h.cookie = [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ');
    if (method !== 'GET' && this.jar.get('ec_csrf') && !h['x-csrf-token'] && h['x-csrf-token'] !== null) h['x-csrf-token'] = this.jar.get('ec_csrf');
    if (h['x-csrf-token'] === null) delete h['x-csrf-token'];
    let payload;
    if (form) payload = form;
    else if (body !== undefined) { h['content-type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetch(BASE + path, { method, headers: h, body: payload, redirect: 'manual' });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [kv] = c.split(';'); const i = kv.indexOf('=');
      const k = kv.slice(0, i), v = kv.slice(i + 1);
      if (/Max-Age=0/i.test(c) || v === '') this.jar.delete(k); else this.jar.set(k, v);
    }
    if (raw) return res;
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
  }
  get = (p, o) => this.req('GET', p, o);
  post = (p, body, o) => this.req('POST', p, { body, ...o });
  put = (p, body, o) => this.req('PUT', p, { body, ...o });
  async bootstrap() { await this.req('GET', '/api/config'); return this; }
  async login(email, password = PW) {
    await this.bootstrap();
    const r = await this.post('/api/auth/login', { email, password });
    if (r.status !== 200) throw new Error(`login failed for ${email}: ${r.status} ${JSON.stringify(r.data)}`);
    return this;
  }
}

// 1x1 transparent PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const proofForm = (fields = {}) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  f.set('file', new Blob([PNG], { type: 'image/png' }), 'receipt.png');
  return f;
};

const phone = () => '+6707' + String(Math.floor(1e7 + Math.random() * 9e6)).slice(0, 7);

async function main() {
  console.log(`API smoke test → ${BASE}\n`);
  const guest = await new Client().bootstrap();

  // Production hides payment methods without real receiving details, so make sure the test shop has some configured.
  const setup = await new Client().login('admin@eloura.local', process.env.SEED_ADMIN_PASSWORD || 'Admin#Eloura2026');
  for (const m of (await setup.get('/api/admin/payment-methods')).data) {
    if (m.key === 'COD' || m.configured) continue;
    const config = m.key === 'TPAY' || m.key === 'MOSAN'
      ? { merchantName: 'Eloura Chic', merchantNumber: '77001000', qrImage: '' }
      : { bankName: 'BNCTL', accountHolder: 'Eloura Chic', accountNumber: '1234567890', branch: 'Dili', swift: '' };
    const r0 = await setup.put(`/api/admin/payment-methods/${m.key}`, { enabled: true, sortOrder: m.sortOrder, name: m.name, instructions: m.instructions, config });
    if (r0.status !== 200) throw new Error(`could not configure ${m.key}: ${JSON.stringify(r0.data)}`);
  }

  console.log('Config & catalogue');
  const cfg = (await guest.get('/api/config')).data;
  ok(cfg.dili.posts.length === 5, '5 Dili administrative posts');
  ok(cfg.dili.posts.reduce((n, p) => n + p.sucos.length, 0) === 31, '31 sucos seeded');
  ok(cfg.paymentMethods.map((m) => m.key).sort().join() === 'ATM_BNCTL,BANK_BNCTL,COD,MOSAN,TPAY', '5 payment methods offered');

  // find a variant to buy (first in-stock variant of the sweater)
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  // Earlier runs reserve stock; reset the two test variants so the suite can be repeated.
  await prisma.productVariant.updateMany({ where: { sku: { in: ['EC-TOP-001-M', 'EC-BAG-001-CRM'] } }, data: { stock: 20, isActive: true } });
  const variant = await prisma.productVariant.findFirstOrThrow({ where: { sku: 'EC-TOP-001-M' } });
  const variant2 = await prisma.productVariant.findFirstOrThrow({ where: { sku: 'EC-BAG-001-CRM' } });
  const stock0 = variant.stock;
  const items = [{ variantId: variant.id, qty: 1 }];

  console.log('\nQuote & COD eligibility (server-side rules)');
  const q = (extra) => guest.post('/api/cart/quote', { items, ...extra }).then((r) => r.data);
  const cod = (qq) => qq.methods.find((m) => m.key === 'COD');
  let r = await q({ municipality: 'dili', adminPost: 'vera_cruz', suco: 'Caicoli', street: 'Rua 1', phone: '+67077001111' });
  ok(cod(r).available === true, 'COD available: Dili / Vera Cruz / Caicoli + mobile');
  r = await q({ municipality: 'dili', adminPost: 'metinaro', suco: 'Sabuli', street: 'Rua 1', phone: '+67077001111' });
  ok(cod(r).available === false && cod(r).reason === 'COD_ONLY_DILI', 'COD hidden: Metinaro (zone COD disabled by admin)', JSON.stringify(cod(r)));
  r = await q({ municipality: 'baucau', street: 'Rua 1', phone: '+67077001111' });
  ok(cod(r).reason === 'COD_ONLY_DILI', 'COD hidden: Baucau');
  r = await q({ municipality: 'atauro', street: 'Rua 1', phone: '+67077001111' });
  ok(cod(r).reason === 'COD_ONLY_DILI', 'COD hidden: Atauro (separate municipality)');
  r = await q({ municipality: 'dili', adminPost: 'dom_aleixo', suco: 'Comoro', street: 'Rua 1', phone: '+6703311111' });
  ok(cod(r).reason === 'COD_NEEDS_MOBILE', 'COD needs a +670 mobile (landline rejected)');
  r = await guest.post('/api/cart/quote', { items: [{ variantId: variant.id, qty: 4 }, { variantId: variant2.id, qty: 3 }], municipality: 'dili', adminPost: 'cristo_rei', suco: 'Becora', street: 'Rua 1', phone: '+67077001111' }).then((x) => x.data);
  ok(cod(r).reason === 'COD_LIMIT', `COD hidden above the cap (subtotal ${r.subtotalCents})`, JSON.stringify(cod(r)));

  console.log('\nCheckout validation');
  const base = { items, name: 'Test Buyer', phone: phone(), municipality: 'dili', adminPost: 'cristo_rei', suco: 'Becora', street: 'Rua da Paz 12', paymentMethod: 'COD' };
  r = await guest.post('/api/orders', base);
  ok(r.status === 422 && r.data.error.code === 'COD_TERMS_REQUIRED', 'COD without accepting terms is refused');
  r = await guest.post('/api/orders', { ...base, municipality: 'baucau', adminPost: '', acceptCodTerms: true });
  ok(r.status === 422 && r.data.error.code === 'COD_ONLY_DILI', 'COD order for Baucau is refused by the server');
  r = await guest.post('/api/orders', { ...base, phone: '+6703311111', acceptCodTerms: true });
  ok(r.status === 422 && r.data.error.code === 'COD_NEEDS_MOBILE', 'COD order with landline is refused');
  r = await guest.post('/api/orders', { ...base, acceptCodTerms: true }, { headers: { 'x-csrf-token': null } });
  ok(r.status === 403 && r.data.error.code === 'CSRF', 'Missing CSRF token is refused');
  r = await guest.post('/api/orders', { ...base, items: [{ variantId: variant.id, qty: 1 }], acceptCodTerms: true });
  ok(r.status === 200 && r.data.code?.startsWith('EC-'), 'COD order accepted (Dili / Cristo Rei)', JSON.stringify(r.data));
  const codOrder = r.data;
  ok(codOrder.status === 'PENDING_CONFIRMATION', 'COD order starts as PENDING_CONFIRMATION');
  let v = await prisma.productVariant.findUnique({ where: { id: variant.id } });
  ok(v.stock === stock0 - 1, 'stock reserved at order time');

  console.log('\nBank / wallet payment flow');
  const customer = await new Client().login('customer@eloura.local');
  r = await customer.post('/api/orders', { ...base, paymentMethod: 'BANK_BNCTL', phone: '+67077001234' });
  ok(r.status === 200 && r.data.status === 'PENDING_PAYMENT', 'bank transfer order → PENDING_PAYMENT');
  const bank = r.data;
  const view = (await customer.get(`/api/orders/${bank.code}`)).data;
  ok(view.pay?.key === 'BANK_BNCTL' && 'accountNumber' in view.pay, 'payment instructions + BNCTL account shown on order page');
  r = await customer.req('POST', `/api/orders/${bank.code}/proof`, { form: proofForm({}) });
  ok(r.status === 422 && r.data.error.code === 'REFERENCE_REQUIRED', 'proof without reference is refused');
  r = await customer.req('POST', `/api/orders/${bank.code}/proof`, { form: proofForm({ reference: 'TRX-' + Date.now() }) });
  ok(r.status === 200 && r.data.status === 'AWAITING_VERIFICATION', 'proof submitted → AWAITING_VERIFICATION', JSON.stringify(r.data).slice(0, 200));
  const guestRead = await guest.get(`/api/orders/${bank.code}`);
  ok(guestRead.status === 403, "another visitor cannot open someone's order without the token");
  const tokRead = await guest.get(`/api/orders/${codOrder.code}?t=${codOrder.token}`);
  ok(tokRead.status === 200, 'guest can open own order with the secret token');

  // ATM needs timestamp
  const atm = (await customer.post('/api/orders', { ...base, paymentMethod: 'ATM_BNCTL', phone: '+67077001234' })).data;
  r = await customer.req('POST', `/api/orders/${atm.code}/proof`, { form: proofForm({ reference: 'ATM-' + Date.now() }) });
  ok(r.status === 422 && r.data.error.code === 'TIMESTAMP_REQUIRED', 'ATM proof requires the receipt date/time');
  r = await customer.req('POST', `/api/orders/${atm.code}/proof`, { form: proofForm({ reference: 'ATM-' + Date.now(), paidAt: '2026-11-24T10:30' }) });
  ok(r.status === 200, 'ATM proof accepted with timestamp');
  // reject non-image
  const bad = new FormData(); bad.set('reference', 'X-' + Date.now()); bad.set('file', new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'x.png');
  const tpay = (await customer.post('/api/orders', { ...base, paymentMethod: 'TPAY', phone: '+67077001234' })).data;
  r = await customer.req('POST', `/api/orders/${tpay.code}/proof`, { form: bad });
  ok(r.status === 400 && r.data.error?.code === 'FILE_INVALID', 'fake image (script) is rejected by content sniffing', r.status + ' ' + JSON.stringify(r.data).slice(0, 200));

  console.log('\nRBAC');
  const finance = await new Client().login('finance@eloura.local');
  const fulfil = await new Client().login('fulfilment@eloura.local');
  const admin = await new Client().login('admin@eloura.local', process.env.SEED_ADMIN_PASSWORD || 'Admin#Eloura2026');
  r = await customer.get('/api/admin/orders');
  ok(r.status === 403, 'CUSTOMER cannot call /api/admin/*');
  r = await new Client().bootstrap().then((c) => c.get('/api/admin/orders'));
  ok(r.status === 401, 'anonymous gets 401');
  r = await fulfil.get('/api/admin/payments');
  ok(r.status === 403, 'ORDER_FULFILLMENT cannot see the payment queue');
  r = await finance.get('/api/admin/settings');
  ok(r.status === 403, 'FINANCE_STAFF cannot open settings');
  r = await finance.get('/api/admin/payments');
  ok(r.status === 200 && r.data.items.some((p) => p.orderCode === bank.code), 'FINANCE sees the submitted proof in the queue');
  const proof = r.data.items.find((p) => p.orderCode === bank.code);
  const file = await finance.req('GET', `/api/admin/payments/${proof.id}/file`, { raw: true });
  ok(file.status === 200 && /image/.test(file.headers.get('content-type')), 'FINANCE can open the private proof file');
  const anonFile = await guest.req('GET', `/api/admin/payments/${proof.id}/file`, { raw: true });
  ok(anonFile.status === 401, 'proof file is not public');
  r = await fulfil.post(`/api/admin/payments/${proof.id}/review`, { approve: true });
  ok(r.status === 403, 'FULFILMENT cannot approve payments');
  r = await finance.post(`/api/admin/payments/${proof.id}/review`, { approve: false });
  ok(r.status === 422, 'rejecting needs a reason');
  r = await finance.post(`/api/admin/payments/${proof.id}/review`, { approve: true, note: 'seen on statement' });
  ok(r.status === 200 && r.data.order.status === 'PROCESSING' && r.data.order.paymentStatus === 'PAID', 'approve → PROCESSING / PAID');
  r = await finance.post(`/api/admin/payments/${proof.id}/review`, { approve: true });
  ok(r.status === 409, 'a proof cannot be approved twice');

  console.log('\nFulfilment of a prepaid order');
  const oid = (await fulfil.get(`/api/admin/orders?q=${bank.code}`)).data.items[0].id;
  for (const next of ['PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED']) {
    r = await fulfil.post(`/api/admin/orders/${oid}/advance`, {});
    ok(r.status === 200 && r.data.status === next, `→ ${next}`, JSON.stringify(r.data).slice(0, 160));
  }

  console.log('\nCOD lifecycle');
  const codId = (await fulfil.get(`/api/admin/orders?q=${codOrder.code}`)).data.items[0].id;
  r = await fulfil.post(`/api/admin/orders/${codId}/advance`, {});
  ok(r.status === 200 && r.data.status === 'PROCESSING', 'COD confirmed by phone → PROCESSING');
  r = await fulfil.post(`/api/admin/orders/${codId}/advance`, {});
  ok(r.status === 200 && r.data.status === 'PACKED', '→ PACKED');
  r = await fulfil.post(`/api/admin/orders/${codId}/advance`, {});
  ok(r.status === 409 && r.data.error.code === 'COURIER_REQUIRED', 'cannot dispatch a COD order without a courier');
  const couriers = (await fulfil.get('/api/admin/couriers')).data;
  r = await fulfil.post(`/api/admin/orders/${codId}/courier`, { courierId: couriers[0].id });
  ok(r.status === 200, 'courier assigned');
  r = await fulfil.post(`/api/admin/orders/${codId}/advance`, {});
  ok(r.status === 200 && r.data.status === 'OUT_FOR_DELIVERY', '→ OUT_FOR_DELIVERY');
  r = await fulfil.post(`/api/admin/orders/${codId}/advance`, { collectedCents: 1 });
  ok(r.status === 422 && r.data.error.code === 'COD_AMOUNT_MISMATCH', 'courier must collect the exact total');
  r = await fulfil.post(`/api/admin/orders/${codId}/advance`, {});
  ok(r.status === 200 && r.data.status === 'DELIVERED' && r.data.paymentStatus === 'PAID', '→ DELIVERED, cash recorded, payment PAID');
  r = await fulfil.post('/api/admin/cod/reconcile', { orderIds: [codId] });
  ok(r.status === 403, 'fulfilment cannot reconcile COD cash');
  r = await finance.post('/api/admin/cod/reconcile', { orderIds: [codId] });
  ok(r.status === 200 && r.data.reconciled === 1, 'finance reconciles the COD cash');

  console.log('\nCOD refusals → automatic flag');
  const abuser = await new Client().login('customer@eloura.local');
  for (let i = 0; i < 2; i++) {
    const o = (await abuser.post('/api/orders', { ...base, paymentMethod: 'COD', phone: '+67077001234', acceptCodTerms: true })).data;
    const id = (await admin.get(`/api/admin/orders?q=${o.code}`)).data.items[0].id;
    await admin.post(`/api/admin/orders/${id}/cancel`, { reason: 'Refused at door', codRefused: true });
  }
  const me = (await abuser.get('/api/auth/me')).data.user;
  ok(me.codBlocked === true, 'customer auto-flagged after 2 refused COD deliveries');
  r = await abuser.post('/api/orders', { ...base, paymentMethod: 'COD', phone: '+67077001234', acceptCodTerms: true });
  ok(r.status === 422 && r.data.error.code === 'COD_BLOCKED', 'COD is refused for the flagged account');
  r = await abuser.post('/api/cart/quote', { items, municipality: 'dili', adminPost: 'cristo_rei', suco: 'Becora', street: 'Rua 1', phone: '+67077001234' });
  ok(r.data.methods.find((m) => m.key === 'COD').reason === 'COD_BLOCKED', 'COD hidden in checkout for the flagged account');
  const cid = (await admin.get('/api/admin/customers?q=customer@eloura.local')).data.items[0].id;
  await admin.post(`/api/admin/customers/${cid}/cod-flag`, { blocked: false });

  console.log('\nStock restore on cancel');
  const before = (await prisma.productVariant.findUnique({ where: { id: variant.id } })).stock;
  const o2 = (await guest.post('/api/orders', { ...base, paymentMethod: 'BANK_BNCTL', phone: phone() })).data;
  const mid = (await prisma.productVariant.findUnique({ where: { id: variant.id } })).stock;
  await guest.post(`/api/orders/${o2.code}/cancel?t=${o2.token}`, {});
  const after = (await prisma.productVariant.findUnique({ where: { id: variant.id } })).stock;
  ok(mid === before - 1 && after === before, 'stock reserved then restored on cancellation', `${before}/${mid}/${after}`);

  console.log('\nAudit log immutability');
  const logs = (await admin.get('/api/admin/audit')).data;
  ok(logs.total > 0, `audit rows recorded (${logs.total})`);
  let blocked = false;
  try { await prisma.auditLog.updateMany({ data: { action: 'tampered' } }); } catch { blocked = true; }
  ok(blocked, 'database refuses UPDATE on AuditLog');
  blocked = false;
  try { await prisma.auditLog.deleteMany({}); } catch { blocked = true; }
  ok(blocked, 'database refuses DELETE on AuditLog');

  console.log('\nRequest hardening');
  // A chunked JSON body has no Content-Length: the 1 MB cap must still hold (streamed and aborted).
  const big = new ReadableStream({ start(c) { const chunk = new Uint8Array(256 * 1024).fill(32); for (let i = 0; i < 12; i++) c.enqueue(chunk); c.close(); } });
  let rr = await fetch(BASE + '/api/newsletter', { method: 'POST', body: big, duplex: 'half', headers: { 'content-type': 'application/json', 'x-forwarded-for': randomIp(), cookie: 'ec_csrf=abc', 'x-csrf-token': 'abc' } });
  ok(rr.status === 413, 'chunked JSON body over 1 MB is refused (413)', String(rr.status));
  const boundary = '----x';
  const mp = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(`--${boundary}\r\nContent-Disposition: form-data; name="reference"\r\n\r\nabc\r\n--${boundary}--\r\n`)); c.close(); } });
  rr = await fetch(BASE + `/api/orders/${codOrder.code}/proof?t=${codOrder.token}`, { method: 'POST', body: mp, duplex: 'half', headers: { 'content-type': `multipart/form-data; boundary=${boundary}`, 'x-forwarded-for': randomIp(), cookie: 'ec_csrf=abc', 'x-csrf-token': 'abc' } });
  ok(rr.status === 413, 'multipart upload without Content-Length is refused (413)', String(rr.status));
  r = await admin.get('/api/admin/orders/abc');
  ok(r.status === 404, 'non-numeric id returns 404 instead of 500', String(r.status));
  r = await admin.get('/api/admin/customers/1.5');
  ok(r.status === 404, 'fractional id returns 404 (not coerced to another record)', String(r.status));

  console.log('\nAccount security');
  const uniq = `sec${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const reg = new Client(); await reg.bootstrap();
  r = await reg.post('/api/auth/register', { name: 'Sec Test', email: `${uniq}@example.test`, password: 'short' });
  ok(r.status === 422, 'weak password is refused at registration');
  r = await reg.post('/api/auth/register', { name: 'Sec Test', email: `${uniq}@example.test`, password: 'Secure-Pass-123' });
  ok(r.status === 200 && r.data.user.roles.some((x) => x.key === 'CUSTOMER'), 'registration creates a CUSTOMER with no permissions');
  ok(r.data.user.permissions.length === 0, 'new customers hold zero permissions');
  r = await new Client().bootstrap().then((c) => c.post('/api/auth/register', { name: 'Dup', email: `${uniq}@example.test`.toUpperCase(), password: 'Secure-Pass-123' }));
  ok(r.status === 409, 'duplicate e-mail (case-insensitive) is refused', String(r.status) + JSON.stringify(r.data));
  // password change revokes every other session
  const devA = await new Client().login(`${uniq}@example.test`, 'Secure-Pass-123');
  const devB = await new Client().login(`${uniq}@example.test`, 'Secure-Pass-123');
  ok((await devB.get('/api/auth/me')).data.user?.email === `${uniq}@example.test`, 'second device is signed in');
  r = await devA.post('/api/auth/password', { current: 'wrong-current-1', next: 'Another-Pass-456' });
  ok(r.status === 401, 'changing password needs the current password');
  r = await devA.post('/api/auth/password', { current: 'Secure-Pass-123', next: 'Another-Pass-456' });
  ok(r.status === 200, 'password changed');
  ok((await devB.get('/api/auth/me')).data.user === null, 'the other device was signed out by the password change');
  ok((await devA.get('/api/auth/me')).data.user !== null, 'the device that changed it stays signed in');
  // lockout after 5 failures
  const lock = new Client(); await lock.bootstrap();
  for (let i = 0; i < 5; i++) await lock.post('/api/auth/login', { email: `${uniq}@example.test`, password: 'nope-nope-1' });
  r = await lock.post('/api/auth/login', { email: `${uniq}@example.test`, password: 'Another-Pass-456' });
  ok(r.status === 423 && r.data.error.code === 'ACCOUNT_LOCKED', 'account is locked after 5 failed logins, even with the right password', String(r.status));

  console.log('\nPrivilege escalation through custom roles');
  const adminMe = (await admin.get('/api/auth/me')).data.user;
  const perms = ['staff.manage', 'roles.manage', 'products.view'];
  r = await admin.post('/api/admin/roles', { name: `Limited ${uniq}`, description: 'test', permissions: perms });
  ok(r.status === 200, 'super admin creates a limited custom role', JSON.stringify(r.data));
  const limitedKey = r.data.key;
  r = await admin.post('/api/admin/staff', { name: 'Limited Admin', email: `${uniq}-lim@example.test`, password: 'Limited-Pass-123', roleKeys: [limitedKey] });
  ok(r.status === 200, 'staff account created with the limited role');
  const lim = await new Client().login(`${uniq}-lim@example.test`, 'Limited-Pass-123');
  r = await lim.post('/api/admin/roles', { name: 'Sneaky', permissions: ['settings.manage'] });
  ok(r.status === 403 && r.data.error.code === 'CANNOT_GRANT', 'a role manager cannot create a role holding permissions they lack');
  r = await lim.post('/api/admin/staff', { name: 'Evil', email: `${uniq}-evil@example.test`, password: 'Evil-Pass-12345', roleKeys: ['SUPER_ADMIN'] });
  ok(r.status === 403 && r.data.error.code === 'CANNOT_GRANT', 'cannot hand out SUPER_ADMIN');
  r = await lim.post('/api/admin/staff', { name: 'Evil', email: `${uniq}-evil2@example.test`, password: 'Evil-Pass-12345', roleKeys: ['STORE_MANAGER'] });
  ok(r.status === 403 && r.data.error.code === 'CANNOT_GRANT', 'cannot hand out a role stronger than your own');
  const staffList = (await lim.get('/api/admin/staff')).data;
  const superId = staffList.find((x) => x.roles.some((y) => y.key === 'SUPER_ADMIN')).id;
  r = await lim.req('PATCH', `/api/admin/staff/${superId}`, { body: { password: 'Hijack-Pass-123' } });
  ok(r.status === 403, 'a limited staff manager cannot reset a Super Admin password');
  r = await admin.req('PATCH', `/api/admin/staff/${adminMe.id}`, { body: { isActive: false } });
  ok(r.status === 403 && r.data.error.code === 'CANNOT_MODIFY_SELF', 'nobody can deactivate themselves');

  console.log('\nAdmin image upload (sharp)');
  const fsm = await import('node:fs');
  const imgForm = (buf, type, name, kind = 'products') => { const f = new FormData(); f.set('kind', kind); f.set('file', new Blob([buf], { type }), name); return f; };
  r = await admin.req('POST', '/api/admin/uploads', { form: imgForm(fsm.readFileSync('design/source/hero-1.png'), 'image/png', 'hero.png', 'banners') });
  ok(r.status === 200 && /^\/media\/banners\/[\w-]+\.webp$/.test(r.data.url), 'PNG upload is re-encoded to WebP and stored under /media', JSON.stringify(r.data));
  const served = await fetch(BASE + r.data.url);
  ok(served.status === 200 && served.headers.get('content-type') === 'image/webp', 'the uploaded image is served publicly as image/webp');
  const meta = await (await import('sharp')).default(Buffer.from(await served.arrayBuffer())).metadata();
  ok(meta.format === 'webp' && !meta.exif, 'stored file is real WebP without EXIF metadata');
  r = await admin.req('POST', '/api/admin/uploads', { form: imgForm(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'image/svg+xml', 'x.svg') });
  ok(r.status === 400 && r.data.error.code === 'FILE_INVALID', 'SVG upload is refused');
  r = await admin.req('POST', '/api/admin/uploads', { form: imgForm(Buffer.alloc(6 * 1024 * 1024 + 10, 1), 'image/png', 'big.png') });
  ok(r.status === 413, 'oversized upload is refused before it is decoded', String(r.status));
  r = await customer.req('POST', '/api/admin/uploads', { form: imgForm(fsm.readFileSync('design/source/hero-1.png'), 'image/png', 'a.png') });
  ok(r.status === 403, 'a customer cannot use the admin upload endpoint');
  r = await guest.get('/media/products/..%2F..%2Fpackage.json', { raw: false });
  ok(r.status === 404, 'media route rejects path traversal');

  console.log('\nData exposure between roles');
  const fOrder = (await fulfil.get(`/api/admin/orders/${oid}`)).data;
  ok(fOrder.proofs.length > 0 && fOrder.proofs.every((p) => p.reference === null && p.payerName === undefined), 'fulfilment sees that proofs exist but not their reference / payer data');
  const finOrder = (await finance.get(`/api/admin/orders/${oid}`)).data;
  ok(finOrder.proofs.some((p) => p.reference), 'finance (payments.view) still sees the proof reference');
  const adminId = (await admin.get('/api/auth/me')).data.user.id;
  r = await finance.get(`/api/admin/customers/${adminId}`);
  ok(r.status === 404, 'the customer detail endpoint does not expose staff / super-admin accounts');
  r = await finance.get('/api/admin/orders?status=constructor');
  ok(r.status === 200, 'prototype-key filter values no longer crash the order list');
  r = await finance.get('/api/admin/payments?status=toString');
  ok(r.status === 200, 'prototype-key filter values no longer crash the payments list');
  const k = `smoke-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const body = { ...base, paymentMethod: 'BANK_BNCTL', phone: phone() };
  const g1 = await guest.post('/api/orders', body, { headers: { 'idempotency-key': k } });
  const g2 = await guest.post('/api/orders', body, { headers: { 'idempotency-key': k } });
  ok(g1.status === 200 && g2.status === 200 && g1.data.code === g2.data.code, 'POST /api/orders with the same Idempotency-Key returns the same order', JSON.stringify([g1.data, g2.data]).slice(0, 200));
  await guest.post(`/api/orders/${g1.data.code}/cancel?t=${g1.data.token}`, {});

  console.log('\nPrivilege escalation guards');
  const mgr = await new Client().login('manager@eloura.local');
  r = await mgr.get('/api/admin/staff');
  ok(r.status === 403, 'STORE_MANAGER cannot manage staff');
  const roles = (await admin.get('/api/admin/roles')).data;
  const sa = roles.find((x) => x.key === 'SUPER_ADMIN');
  r = await admin.put(`/api/admin/roles/${sa.id}`, { name: 'x', permissions: [] });
  ok(r.status === 403 && r.data.error.code === 'ROLE_LOCKED', 'SUPER_ADMIN role is locked');

  await prisma.$disconnect();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
