const crypto = require('crypto');
const express = require('express');
const path = require('path');
const { initDb } = require('./db/initDb');
const { hashPassword, verifyPassword } = require('./auth/password');

const SESSION_COOKIE_NAME = 'techexit_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production';

const app = express();
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'public')));

function normalizeBasePath(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === '/') return '';
  const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withLeadingSlash.replace(/\/+$/, '');
}

const CONFIGURED_BASE_PATH = normalizeBasePath(process.env.APP_BASE_PATH);

function resolveBasePath(req) {
  const forwardedPrefix = req.headers['x-forwarded-prefix'];
  if (typeof forwardedPrefix === 'string' && forwardedPrefix.trim()) {
    return normalizeBasePath(forwardedPrefix);
  }
  if (Array.isArray(forwardedPrefix) && forwardedPrefix.length > 0) {
    return normalizeBasePath(forwardedPrefix[0]);
  }
  return CONFIGURED_BASE_PATH;
}

function cookiePath(req) {
  return resolveBasePath(req) || '/';
}

function shouldUseSecureCookie(req) {
  const explicit = String(process.env.COOKIE_SECURE || '').trim().toLowerCase();
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;

  const forwardedProto = req.headers['x-forwarded-proto'];
  if (typeof forwardedProto === 'string') {
    const proto = forwardedProto.split(',')[0].trim().toLowerCase();
    return proto === 'https';
  }
  if (Array.isArray(forwardedProto) && forwardedProto.length > 0) {
    return String(forwardedProto[0]).trim().toLowerCase() === 'https';
  }
  return Boolean(req.secure);
}

function mapSystemRow(row) {
  return {
    ...row,
    annual_cost_eur: row.annual_cost_eur == null ? null : Number(row.annual_cost_eur)
  };
}

function mapPublicUserRow(row) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    is_active: row.is_active === 1,
    created_at: row.created_at || null,
    last_login_at: row.last_login_at || null
  };
}

function parseBoolean(value) {
  if (value === true || value === 1 || value === '1' || value === 'true') return 1;
  if (value === false || value === 0 || value === '0' || value === 'false') return 0;
  return null;
}

function parseCookies(cookieHeader = '') {
  const cookies = {};
  const parts = String(cookieHeader || '').split(';');
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) continue;
    if (Object.prototype.hasOwnProperty.call(cookies, rawKey)) continue;
    const rawValue = rest.join('=');
    try {
      cookies[rawKey] = decodeURIComponent(rawValue);
    } catch (_error) {
      cookies[rawKey] = rawValue;
    }
  }
  return cookies;
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(`${token}:${SESSION_SECRET}`).digest('hex');
}

function isExpired(expiresAt) {
  return new Date(expiresAt).getTime() <= Date.now();
}

function setSessionCookie(req, res, token) {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookie(req),
    path: cookiePath(req),
    maxAge: SESSION_TTL_MS
  });
}

function clearSessionCookie(req, res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookie(req),
    path: cookiePath(req)
  });
}

async function buildImpactGraph(db, startSystemId) {
  const visited = new Set();
  const queue = [startSystemId];
  const edges = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    const outgoing = await db.all(
      `SELECT source_system_id, target_system_id, dependency_type, criticality
       FROM system_dependencies
       WHERE source_system_id = ?`,
      current
    );

    for (const dep of outgoing) {
      edges.push(dep);
      if (!visited.has(dep.target_system_id)) queue.push(dep.target_system_id);
    }
  }

  const ids = Array.from(visited);
  if (ids.length === 0) return { systems: [], dependencies: [] };

  const placeholders = ids.map(() => '?').join(',');
  const systems = await db.all(`SELECT * FROM systems WHERE id IN (${placeholders})`, ...ids);

  return {
    systems: systems.map(mapSystemRow),
    dependencies: edges
  };
}

async function start() {
  const db = await initDb();

  async function cleanupExpiredSessions() {
    await db.run(`DELETE FROM user_sessions WHERE datetime(expires_at) <= datetime('now')`);
  }

  app.use(async (req, res, next) => {
    try {
      req.authUser = null;
      req.sessionTokenHash = null;

      const token = parseCookies(req.headers.cookie || '')[SESSION_COOKIE_NAME];
      if (!token) {
        next();
        return;
      }

      const tokenHash = hashSessionToken(token);
      const sessionRow = await db.get(
        `SELECT us.id AS session_id, us.expires_at, u.id, u.username, u.role, u.is_active
         FROM user_sessions us
         JOIN users u ON u.id = us.user_id
         WHERE us.token_hash = ?`,
        tokenHash
      );

      if (!sessionRow || sessionRow.is_active !== 1 || isExpired(sessionRow.expires_at)) {
        if (sessionRow) {
          await db.run('DELETE FROM user_sessions WHERE id = ?', sessionRow.session_id);
        }
        clearSessionCookie(req, res);
        next();
        return;
      }

      req.authUser = {
        id: sessionRow.id,
        username: sessionRow.username,
        role: sessionRow.role
      };
      req.sessionTokenHash = tokenHash;

      await db.run('UPDATE user_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?', sessionRow.session_id);
      next();
    } catch (error) {
      next(error);
    }
  });

  function requireAuth(req, res, next) {
    if (!req.authUser) {
      res.status(401).json({ error: 'Du skal logge ind' });
      return;
    }
    next();
  }

  function requireAdmin(req, res, next) {
    if (!req.authUser) {
      res.status(401).json({ error: 'Du skal logge ind' });
      return;
    }
    if (req.authUser.role !== 'admin') {
      res.status(403).json({ error: 'Kun administratorer har adgang' });
      return;
    }
    next();
  }

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/auth/me', (req, res) => {
    if (!req.authUser) {
      res.json({ authenticated: false });
      return;
    }

    res.json({
      authenticated: true,
      user: req.authUser
    });
  });

  app.post('/auth/login', async (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');

    if (!username || !password) {
      res.status(400).json({ error: 'Brugernavn og adgangskode er påkrævet' });
      return;
    }

    const user = await db.get('SELECT * FROM users WHERE lower(username) = lower(?)', username);
    if (!user || user.is_active !== 1 || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: 'Forkert brugernavn eller adgangskode' });
      return;
    }

    await cleanupExpiredSessions();
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionTokenHash = hashSessionToken(sessionToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

    await db.run(
      `INSERT INTO user_sessions (user_id, token_hash, expires_at)
       VALUES (?, ?, ?)`,
      user.id,
      sessionTokenHash,
      expiresAt
    );

    await db.run(
      `UPDATE users
       SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      user.id
    );

    setSessionCookie(req, res, sessionToken);
    res.json({ user: mapPublicUserRow(user) });
  });

  app.post('/auth/change-password', requireAuth, async (req, res) => {
    const currentPassword = String(req.body?.current_password || '');
    const newPassword = String(req.body?.new_password || '');

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Nuværende og ny adgangskode er påkrævet' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'Ny adgangskode skal være mindst 8 tegn' });
      return;
    }

    if (currentPassword === newPassword) {
      res.status(400).json({ error: 'Ny adgangskode skal være forskellig fra den nuværende' });
      return;
    }

    const user = await db.get('SELECT id, password_hash, is_active FROM users WHERE id = ?', req.authUser.id);
    if (!user || user.is_active !== 1) {
      res.status(401).json({ error: 'Bruger er ikke aktiv' });
      return;
    }

    if (!verifyPassword(currentPassword, user.password_hash)) {
      res.status(400).json({ error: 'Nuværende adgangskode er forkert' });
      return;
    }

    await db.run(
      `UPDATE users
       SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      hashPassword(newPassword),
      user.id
    );

    if (req.sessionTokenHash) {
      await db.run(
        'DELETE FROM user_sessions WHERE user_id = ? AND token_hash <> ?',
        user.id,
        req.sessionTokenHash
      );
    }

    res.status(204).send();
  });

  app.post('/auth/logout', async (req, res) => {
    if (req.sessionTokenHash) {
      await db.run('DELETE FROM user_sessions WHERE token_hash = ?', req.sessionTokenHash);
    }
    clearSessionCookie(req, res);
    res.status(204).send();
  });

  app.get('/users', requireAdmin, async (_req, res) => {
    const users = await db.all(
      `SELECT id, username, role, is_active, created_at, last_login_at
       FROM users
       ORDER BY username COLLATE NOCASE ASC`
    );

    res.json(users.map(mapPublicUserRow));
  });

  app.post('/users', requireAdmin, async (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    const role = String(req.body?.role || 'editor').trim();
    const allowedRoles = new Set(['admin', 'editor']);

    if (!username || username.length < 3) {
      res.status(400).json({ error: 'Brugernavn skal være mindst 3 tegn' });
      return;
    }

    if (!password || password.length < 8) {
      res.status(400).json({ error: 'Adgangskode skal være mindst 8 tegn' });
      return;
    }

    if (!allowedRoles.has(role)) {
      res.status(400).json({ error: 'Rolle skal være enten admin eller editor' });
      return;
    }

    const existing = await db.get('SELECT id FROM users WHERE lower(username) = lower(?)', username);
    if (existing) {
      res.status(409).json({ error: 'Brugernavnet findes allerede' });
      return;
    }

    const result = await db.run(
      `INSERT INTO users (username, password_hash, role, is_active)
       VALUES (?, ?, ?, 1)`,
      username,
      hashPassword(password),
      role
    );

    const created = await db.get(
      `SELECT id, username, role, is_active, created_at, last_login_at
       FROM users
       WHERE id = ?`,
      result.lastID
    );

    res.status(201).json(mapPublicUserRow(created));
  });

  app.get('/systems', requireAuth, async (req, res) => {
    const { status, category, priority } = req.query;
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (priority) {
      conditions.push('replacement_priority = ?');
      params.push(priority);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await db.all(
      `SELECT * FROM systems ${where}
       ORDER BY
         CASE criticality
           WHEN 'critical' THEN 4
           WHEN 'high' THEN 3
           WHEN 'medium' THEN 2
           WHEN 'low' THEN 1
           ELSE 0
         END DESC,
         name ASC`,
      ...params
    );

    res.json(rows.map(mapSystemRow));
  });

  app.get('/systems/:id', requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const system = await db.get('SELECT * FROM systems WHERE id = ?', id);

    if (!system) {
      res.status(404).json({ error: 'System not found' });
      return;
    }

    const [alternatives, outgoingDependencies, incomingDependencies] = await Promise.all([
      db.all('SELECT * FROM alternatives WHERE system_id = ? ORDER BY eu_based DESC, fit_score DESC', id),
      db.all(
        `SELECT d.*, s2.name AS target_system_name
         FROM system_dependencies d
         JOIN systems s2 ON s2.id = d.target_system_id
         WHERE d.source_system_id = ?`,
        id
      ),
      db.all(
        `SELECT d.*, s1.name AS source_system_name
         FROM system_dependencies d
         JOIN systems s1 ON s1.id = d.source_system_id
         WHERE d.target_system_id = ?`,
        id
      )
    ]);

    res.json({
      system: mapSystemRow(system),
      alternatives,
      dependencies: {
        outgoing: outgoingDependencies,
        incoming: incomingDependencies
      }
    });
  });

  app.post('/systems', requireAuth, async (req, res) => {
    const payload = req.body;
    const required = ['name', 'category', 'vendor', 'origin_country', 'hosting_model', 'criticality', 'data_classification', 'replacement_priority'];
    const missing = required.filter((field) => !payload[field]);

    if (missing.length > 0) {
      res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
      return;
    }

    const result = await db.run(
      `INSERT INTO systems
       (name, category, vendor, origin_country, hosting_model, business_owner, technical_owner, criticality, data_classification, replacement_priority, annual_cost_eur, contract_end_date, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      payload.name,
      payload.category,
      payload.vendor,
      payload.origin_country,
      payload.hosting_model,
      payload.business_owner || null,
      payload.technical_owner || null,
      payload.criticality,
      payload.data_classification,
      payload.replacement_priority,
      payload.annual_cost_eur || null,
      payload.contract_end_date || null,
      payload.status || 'active',
      payload.notes || null
    );

    const created = await db.get('SELECT * FROM systems WHERE id = ?', result.lastID);
    res.status(201).json(mapSystemRow(created));
  });

  app.post('/systems/quick', requireAuth, async (req, res) => {
    const name = String(req.body?.name || '').trim();
    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const existing = await db.get('SELECT * FROM systems WHERE lower(name) = lower(?)', name);
    if (existing) {
      res.json(mapSystemRow(existing));
      return;
    }

    const result = await db.run(
      `INSERT INTO systems
       (name, category, vendor, origin_country, hosting_model, criticality, data_classification, replacement_priority, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      name,
      'Unknown',
      'Unknown',
      'Unknown',
      'Unknown',
      'medium',
      'internal',
      'medium',
      'planned',
      'Quick created. Fill in details later.'
    );

    const created = await db.get('SELECT * FROM systems WHERE id = ?', result.lastID);
    res.status(201).json(mapSystemRow(created));
  });

  app.put('/systems/:id', requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const payload = req.body;
    const existing = await db.get('SELECT * FROM systems WHERE id = ?', id);

    if (!existing) {
      res.status(404).json({ error: 'System not found' });
      return;
    }

    const merged = {
      ...existing,
      ...payload,
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    const required = ['name', 'category', 'vendor', 'origin_country', 'hosting_model', 'criticality', 'data_classification', 'replacement_priority', 'status'];
    const missing = required.filter((field) => !merged[field]);

    if (missing.length > 0) {
      res.status(400).json({ error: `Missing fields after merge: ${missing.join(', ')}` });
      return;
    }

    await db.run(
      `UPDATE systems
       SET name = ?, category = ?, vendor = ?, origin_country = ?, hosting_model = ?, business_owner = ?, technical_owner = ?,
           criticality = ?, data_classification = ?, replacement_priority = ?, annual_cost_eur = ?, contract_end_date = ?, status = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      merged.name,
      merged.category,
      merged.vendor,
      merged.origin_country,
      merged.hosting_model,
      merged.business_owner || null,
      merged.technical_owner || null,
      merged.criticality,
      merged.data_classification,
      merged.replacement_priority,
      merged.annual_cost_eur || null,
      merged.contract_end_date || null,
      merged.status,
      merged.notes || null,
      merged.updated_at,
      id
    );

    const updated = await db.get('SELECT * FROM systems WHERE id = ?', id);
    res.json(mapSystemRow(updated));
  });

  app.delete('/systems/:id', requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const result = await db.run('DELETE FROM systems WHERE id = ?', id);

    if (result.changes === 0) {
      res.status(404).json({ error: 'System not found' });
      return;
    }

    res.status(204).send();
  });

  app.post('/systems/:id/alternatives', requireAuth, async (req, res) => {
    const systemId = Number(req.params.id);
    const payload = req.body;

    const system = await db.get('SELECT id FROM systems WHERE id = ?', systemId);
    if (!system) {
      res.status(404).json({ error: 'System not found' });
      return;
    }

    const required = ['name', 'vendor', 'vendor_country', 'eu_based'];
    const missing = required.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === '');

    if (missing.length > 0) {
      res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
      return;
    }

    const euBased = parseBoolean(payload.eu_based);
    if (euBased === null) {
      res.status(400).json({ error: 'eu_based must be true/false' });
      return;
    }

    const result = await db.run(
      `INSERT INTO alternatives
       (system_id, name, vendor, vendor_country, eu_based, hosting_options, fit_score, migration_complexity, estimated_annual_cost_eur, data_portability_score, notes, website_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      systemId,
      payload.name,
      payload.vendor,
      payload.vendor_country,
      euBased,
      payload.hosting_options || null,
      payload.fit_score || null,
      payload.migration_complexity || null,
      payload.estimated_annual_cost_eur || null,
      payload.data_portability_score || null,
      payload.notes || null,
      payload.website_url || null
    );

    const created = await db.get('SELECT * FROM alternatives WHERE id = ?', result.lastID);
    res.status(201).json(created);
  });

  app.put('/alternatives/:id', requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const payload = req.body;
    const existing = await db.get('SELECT * FROM alternatives WHERE id = ?', id);

    if (!existing) {
      res.status(404).json({ error: 'Alternative not found' });
      return;
    }

    const merged = { ...existing, ...payload };
    if (!merged.name || !merged.vendor || !merged.vendor_country) {
      res.status(400).json({ error: 'name, vendor and vendor_country are required' });
      return;
    }

    const euBased = parseBoolean(merged.eu_based);
    if (euBased === null) {
      res.status(400).json({ error: 'eu_based must be true/false' });
      return;
    }

    await db.run(
      `UPDATE alternatives
       SET name = ?, vendor = ?, vendor_country = ?, eu_based = ?, hosting_options = ?, fit_score = ?, migration_complexity = ?,
           estimated_annual_cost_eur = ?, data_portability_score = ?, notes = ?, website_url = ?
       WHERE id = ?`,
      merged.name,
      merged.vendor,
      merged.vendor_country,
      euBased,
      merged.hosting_options || null,
      merged.fit_score || null,
      merged.migration_complexity || null,
      merged.estimated_annual_cost_eur || null,
      merged.data_portability_score || null,
      merged.notes || null,
      merged.website_url || null,
      id
    );

    const updated = await db.get('SELECT * FROM alternatives WHERE id = ?', id);
    res.json(updated);
  });

  app.delete('/alternatives/:id', requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const result = await db.run('DELETE FROM alternatives WHERE id = ?', id);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Alternative not found' });
      return;
    }

    res.status(204).send();
  });

  app.post('/dependencies', requireAuth, async (req, res) => {
    const payload = req.body;
    const required = ['source_system_id', 'target_system_id', 'dependency_type', 'direction', 'criticality'];
    const missing = required.filter((field) => !payload[field]);

    if (missing.length > 0) {
      res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
      return;
    }

    const result = await db.run(
      `INSERT INTO system_dependencies
       (source_system_id, target_system_id, dependency_type, direction, criticality, data_shared, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      payload.source_system_id,
      payload.target_system_id,
      payload.dependency_type,
      payload.direction,
      payload.criticality,
      payload.data_shared || null,
      payload.notes || null
    );

    const created = await db.get('SELECT * FROM system_dependencies WHERE id = ?', result.lastID);
    res.status(201).json(created);
  });

  app.put('/dependencies/:id', requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const payload = req.body;
    const existing = await db.get('SELECT * FROM system_dependencies WHERE id = ?', id);

    if (!existing) {
      res.status(404).json({ error: 'Dependency not found' });
      return;
    }

    const merged = { ...existing, ...payload };
    const required = ['source_system_id', 'target_system_id', 'dependency_type', 'direction', 'criticality'];
    const missing = required.filter((field) => !merged[field]);

    if (missing.length > 0) {
      res.status(400).json({ error: `Missing fields after merge: ${missing.join(', ')}` });
      return;
    }

    if (Number(merged.source_system_id) === Number(merged.target_system_id)) {
      res.status(400).json({ error: 'source_system_id and target_system_id must be different' });
      return;
    }

    await db.run(
      `UPDATE system_dependencies
       SET source_system_id = ?, target_system_id = ?, dependency_type = ?, direction = ?, criticality = ?, data_shared = ?, notes = ?
       WHERE id = ?`,
      merged.source_system_id,
      merged.target_system_id,
      merged.dependency_type,
      merged.direction,
      merged.criticality,
      merged.data_shared || null,
      merged.notes || null,
      id
    );

    const updated = await db.get('SELECT * FROM system_dependencies WHERE id = ?', id);
    res.json(updated);
  });

  app.delete('/dependencies/:id', requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const result = await db.run('DELETE FROM system_dependencies WHERE id = ?', id);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Dependency not found' });
      return;
    }

    res.status(204).send();
  });

  app.get('/analysis/impact/:systemId', requireAuth, async (req, res) => {
    const systemId = Number(req.params.systemId);

    const system = await db.get('SELECT * FROM systems WHERE id = ?', systemId);
    if (!system) {
      res.status(404).json({ error: 'System not found' });
      return;
    }

    const graph = await buildImpactGraph(db, systemId);
    const criticalEdges = graph.dependencies.filter((d) => d.criticality === 'critical').length;

    res.json({
      root_system: mapSystemRow(system),
      impacted_system_count: graph.systems.length - 1,
      dependency_count: graph.dependencies.length,
      critical_dependency_count: criticalEdges,
      graph
    });
  });

  app.get('/graph', requireAuth, async (_req, res) => {
    const [systems, dependencies] = await Promise.all([
      db.all('SELECT id, name, category, criticality, replacement_priority FROM systems ORDER BY id'),
      db.all('SELECT id, source_system_id, target_system_id, dependency_type, criticality FROM system_dependencies ORDER BY id')
    ]);

    res.json({ nodes: systems, edges: dependencies });
  });

  app.get('*', (_req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log('SQLite file: data.sqlite');
  });
}

start().catch((error) => {
  console.error('Failed to start application', error);
  process.exit(1);
});
