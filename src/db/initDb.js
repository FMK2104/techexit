const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { hashPassword } = require('../auth/password');

const DB_PATH = process.env.DB_PATH
  ? (path.isAbsolute(process.env.DB_PATH) ? process.env.DB_PATH : path.join(process.cwd(), process.env.DB_PATH))
  : path.join(process.cwd(), 'data.sqlite');

async function initDb() {
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  await db.exec('PRAGMA foreign_keys = ON;');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS systems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      vendor TEXT NOT NULL,
      origin_country TEXT NOT NULL,
      hosting_model TEXT NOT NULL,
      business_owner TEXT,
      technical_owner TEXT,
      criticality TEXT NOT NULL CHECK (criticality IN ('low', 'medium', 'high', 'critical')),
      data_classification TEXT NOT NULL CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted')),
      replacement_priority TEXT NOT NULL CHECK (replacement_priority IN ('low', 'medium', 'high')),
      annual_cost_eur REAL,
      contract_end_date TEXT,
      status TEXT NOT NULL CHECK (status IN ('active', 'phase_out', 'planned', 'retired')) DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alternatives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      system_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      vendor TEXT NOT NULL,
      vendor_country TEXT NOT NULL,
      eu_based INTEGER NOT NULL CHECK (eu_based IN (0, 1)),
      hosting_options TEXT,
      fit_score INTEGER CHECK (fit_score >= 1 AND fit_score <= 10),
      migration_complexity TEXT CHECK (migration_complexity IN ('low', 'medium', 'high')),
      estimated_annual_cost_eur REAL,
      data_portability_score INTEGER CHECK (data_portability_score >= 1 AND data_portability_score <= 10),
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS system_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_system_id INTEGER NOT NULL,
      target_system_id INTEGER NOT NULL,
      dependency_type TEXT NOT NULL CHECK (dependency_type IN ('api', 'file_transfer', 'sso', 'database', 'manual_process', 'other')),
      direction TEXT NOT NULL CHECK (direction IN ('source_to_target', 'bidirectional')),
      criticality TEXT NOT NULL CHECK (criticality IN ('low', 'medium', 'high', 'critical')),
      data_shared TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (source_system_id) REFERENCES systems (id) ON DELETE CASCADE,
      FOREIGN KEY (target_system_id) REFERENCES systems (id) ON DELETE CASCADE,
      CHECK (source_system_id <> target_system_id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'editor')) DEFAULT 'editor',
      is_active INTEGER NOT NULL CHECK (is_active IN (0, 1)) DEFAULT 1,
      last_login_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_alternatives_system_id ON alternatives(system_id);
    CREATE INDEX IF NOT EXISTS idx_dependencies_source ON system_dependencies(source_system_id);
    CREATE INDEX IF NOT EXISTS idx_dependencies_target ON system_dependencies(target_system_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
  `);

  const altColumns = await db.all('PRAGMA table_info(alternatives)');
  const hasWebsiteUrl = altColumns.some((column) => column.name === 'website_url');
  if (!hasWebsiteUrl) {
    await db.exec('ALTER TABLE alternatives ADD COLUMN website_url TEXT');
  }

  const existing = await db.get('SELECT COUNT(*) AS count FROM systems');

  if (existing.count === 0) {
    await seed(db);
  }

  const existingUsers = await db.get('SELECT COUNT(*) AS count FROM users');
  if (existingUsers.count === 0) {
    const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    await db.run(
      `INSERT INTO users (username, password_hash, role, is_active)
       VALUES (?, ?, 'admin', 1)`,
      defaultUsername,
      hashPassword(defaultPassword)
    );

    console.log(
      `[auth] Oprettede standard administrator: brugernavn "${defaultUsername}" med adgangskode "${defaultPassword}".`
    );
    console.log('[auth] Opret en ny admin-bruger efter login og fjern derefter standard-login fra miljøet.');
  }

  return db;
}

async function seed(db) {
  await db.run(`
    INSERT INTO systems
      (name, category, vendor, origin_country, hosting_model, business_owner, technical_owner, criticality, data_classification, replacement_priority, annual_cost_eur, contract_end_date, status, notes)
    VALUES
      ('Microsoft 365', 'Productivity', 'Microsoft', 'United States', 'SaaS', 'COO', 'IT Operations', 'critical', 'confidential', 'high', 120000, '2026-11-30', 'active', 'Office suite, email og samarbejde'),
      ('Salesforce CRM', 'CRM', 'Salesforce', 'United States', 'SaaS', 'Sales Director', 'Business Apps Team', 'high', 'confidential', 'high', 95000, '2027-03-31', 'active', 'Kundesalg og pipeline'),
      ('Jira Cloud', 'Project Management', 'Atlassian', 'Australia', 'SaaS', 'Engineering Manager', 'Platform Team', 'medium', 'internal', 'medium', 24000, '2026-08-15', 'active', 'Issue tracking og agile boards'),
      ('Slack', 'Communication', 'Salesforce', 'United States', 'SaaS', 'HR Director', 'Workplace IT', 'high', 'internal', 'medium', 36000, '2026-12-01', 'active', 'Intern kommunikation');
  `);

  await db.run(`
    INSERT INTO alternatives
      (system_id, name, vendor, vendor_country, eu_based, hosting_options, fit_score, migration_complexity, estimated_annual_cost_eur, data_portability_score, notes, website_url)
    VALUES
      (1, 'Nextcloud Hub', 'Nextcloud GmbH', 'Germany', 1, 'Self-hosted, EU cloud partner', 8, 'high', 65000, 7, 'Kan dække filer, samarbejde og delvist mail med ekstra moduler', 'https://nextcloud.com/hub/'),
      (1, 'ONLYOFFICE Workspace', 'Ascensio System SIA', 'Latvia', 1, 'Self-hosted, cloud', 7, 'medium', 55000, 8, 'Office-kompatibilitet med fokus paa dokumenter', 'https://www.onlyoffice.com/workspace.aspx'),
      (2, 'Odoo CRM', 'Odoo S.A.', 'Belgium', 1, 'Cloud, self-hosted', 7, 'medium', 40000, 8, 'Bred ERP/CRM-platform med modulopbygning', 'https://www.odoo.com/'),
      (2, 'Vtiger One', 'Vtiger', 'India', 0, 'Cloud', 6, 'medium', 30000, 6, 'Ikke-EU, men muligt fallback', 'https://www.vtiger.com/'),
      (3, 'OpenProject', 'OpenProject GmbH', 'Germany', 1, 'Cloud, self-hosted', 8, 'medium', 18000, 9, 'Stærk projektstyring med on-prem mulighed', 'https://www.openproject.org/'),
      (4, 'Mattermost', 'Mattermost', 'United States', 0, 'Self-hosted, cloud', 7, 'low', 22000, 8, 'God til sikker intern chat, men ikke EU-baseret', 'https://mattermost.com/'),
      (4, 'Element (Matrix)', 'Element HQ', 'United Kingdom', 0, 'Self-hosted, cloud', 8, 'medium', 20000, 9, 'Federeret chat med stor fleksibilitet', 'https://element.io/');
  `);

  await db.run(`
    INSERT INTO system_dependencies
      (source_system_id, target_system_id, dependency_type, direction, criticality, data_shared, notes)
    VALUES
      (2, 1, 'sso', 'source_to_target', 'high', 'Brugeridentiteter', 'CRM-login via Microsoft SSO'),
      (3, 1, 'sso', 'source_to_target', 'medium', 'Brugeridentiteter', 'Jira login via Microsoft konto'),
      (4, 1, 'sso', 'source_to_target', 'high', 'Brugeridentiteter', 'Slack autentificering via Microsoft 365'),
      (2, 4, 'api', 'source_to_target', 'medium', 'Lead-opdateringer', 'Notifikationer fra CRM til Slack-kanaler'),
      (3, 4, 'api', 'source_to_target', 'low', 'Build alerts', 'CI alarmer til Slack');
  `);
}

module.exports = { initDb };
