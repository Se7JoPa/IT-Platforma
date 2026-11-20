'use strict';
const {randomBytes, createHash, scrypt, timingSafeEqual} = require('node:crypto');
const {promisify} = require('node:util');
const deriveKey = promisify(scrypt);
const lifetime = 7 * 24 * 60 * 60;
const cookieName = 'college_session';

function error(message, status) {
  throw Object.assign(new Error(message), {status});
}

function tokenHash(req) {
  const match = /(?:^|;\s*)college_session=([0-9a-f]{64})(?:;|$)/.exec(req.headers.cookie || '');
  return match ? createHash('sha256').update(match[1]).digest('hex') : '';
}

function setCookie(res, token, seconds) {
  res.setHeader('Set-Cookie', cookieName + '=' + token + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' + seconds);
}

function createAuth(db, transaction) {
  const attempts = new Map();
  const now = () => Math.floor(Date.now() / 1000);

  function current(req) {
    return db.prepare(`SELECT a.id, a.name, a.email FROM accounts a JOIN sessions s ON s.account_id=a.id
      WHERE s.token_hash=? AND s.expires_at>?`).get(tokenHash(req), now());
  }

  function openSession(req, accountId) {
    const token = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(token).digest('hex');
    db.prepare('DELETE FROM sessions WHERE expires_at<=? OR token_hash=?').run(now(), tokenHash(req));
    db.prepare('INSERT INTO sessions(token_hash,account_id,expires_at) VALUES(?,?,?)').run(hash, accountId, now()+lifetime);
    return token;
  }

  async function handle(action, body, req, res) {
    if (action === 'logout') {
      db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(req));
      setCookie(res, '', 0);
      return;
    }
    const ip = req.socket.remoteAddress;
    const window = attempts.get(ip);
    if (!window || window.ends <= now()) attempts.set(ip, {count: 0, ends: now()+300});
    const counter = attempts.get(ip);
    if (++counter.count > 30) error('Слишком много попыток. Попробуйте через пять минут.', 429);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = body.password;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) error('Проверьте адрес электронной почты.', 400);
    if (typeof password !== 'string' || !password || password.length > 128) error('Проверьте пароль.', 400);

    let token;
    if (action === 'register') {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name || name.length > 120) error('Укажите имя (до 120 символов).', 400);
      if (password.length < 8) error('Пароль должен содержать минимум 8 символов.', 400);
      const salt = randomBytes(16).toString('hex');
      const hash = (await deriveKey(password, salt, 64)).toString('hex');
      token = transaction(() => {
        const result = db.prepare(`INSERT INTO accounts(name,email,salt,password_hash)
          VALUES(?,?,?,?) ON CONFLICT(email) DO NOTHING`).run(name, email, salt, hash);
        if (!result.changes) error('Эта почта уже зарегистрирована. Войдите в аккаунт.', 409);
        return openSession(req, result.lastInsertRowid);
      });
    } else {
      const account = db.prepare('SELECT id,salt,password_hash FROM accounts WHERE email=?').get(email);
      const derived = await deriveKey(password, account?.salt || 'unknown-account', 64);
      if (!account || !timingSafeEqual(derived, Buffer.from(account.password_hash, 'hex'))) {
        error('Неверная почта или пароль.', 401);
      }
      token = transaction(() => openSession(req, account.id));
    }
    setCookie(res, token, lifetime);
  }
  return {current, handle};
}
module.exports = {createAuth};
