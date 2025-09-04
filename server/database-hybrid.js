const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Verificar se deve usar PostgreSQL ou SQLite
const usePostgreSQL = process.env.DATABASE_URL && process.env.NODE_ENV === 'production';

let db;

if (usePostgreSQL) {
  // Usar PostgreSQL em produção
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  db = {
    query: (text, params) => pool.query(text, params),
    get: (text, params) => pool.query(text, params).then(result => result.rows[0] || null),
    all: (text, params) => pool.query(text, params).then(result => result.rows),
    run: (text, params) => pool.query(text, params).then(result => ({ changes: result.rowCount })),
    close: () => pool.end()
  };

  console.log('🐘 Usando PostgreSQL (produção)');
} else {
  // Usar SQLite em desenvolvimento
  const dbPath = path.join(__dirname, 'clientes.db');
  const sqliteDb = new sqlite3.Database(dbPath);

  db = {
    query: (text, params, callback) => {
      if (callback) {
        sqliteDb.all(text, params, callback);
      } else {
        return new Promise((resolve, reject) => {
          sqliteDb.all(text, params, (err, rows) => {
            if (err) reject(err);
            else resolve({ rows });
          });
        });
      }
    },
    get: (text, params, callback) => {
      if (callback) {
        sqliteDb.get(text, params, callback);
      } else {
        return new Promise((resolve, reject) => {
          sqliteDb.get(text, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
      }
    },
    all: (text, params, callback) => {
      if (callback) {
        sqliteDb.all(text, params, callback);
      } else {
        return new Promise((resolve, reject) => {
          sqliteDb.all(text, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
      }
    },
    run: (text, params, callback) => {
      if (callback) {
        sqliteDb.run(text, params, callback);
      } else {
        return new Promise((resolve, reject) => {
          sqliteDb.run(text, params, function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
          });
        });
      }
    },
    close: () => sqliteDb.close()
  };

  console.log('🗄️  Usando SQLite (desenvolvimento)');
}

// Criar tabela de clientes (SQLite)
if (!usePostgreSQL) {
  // Usar o método serialize do SQLite
  const sqliteDb = new sqlite3.Database(path.join(__dirname, 'clientes.db'));
  sqliteDb.serialize(() => {
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      email TEXT,
      telefone TEXT,
      empresa TEXT,
      tem_whatsapp BOOLEAN DEFAULT 0,
      status TEXT DEFAULT 'ativo' CHECK(status IN ('ativo', 'inativo')),
      fez_contato BOOLEAN DEFAULT 0,
      vale_pena_contato BOOLEAN DEFAULT 0,
      data_contato TEXT,
      observacoes TEXT,
      data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
      data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Adicionar coluna empresa se não existir
    sqliteDb.run(`ALTER TABLE clientes ADD COLUMN empresa TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Erro ao adicionar coluna empresa:', err);
      }
    });

    // Adicionar coluna vale_pena_contato se não existir
    sqliteDb.run(`ALTER TABLE clientes ADD COLUMN vale_pena_contato BOOLEAN DEFAULT 0`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Erro ao adicionar coluna vale_pena_contato:', err);
      }
    });

    // Criar índices
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_status ON clientes(status)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_whatsapp ON clientes(tem_whatsapp)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_contato ON clientes(fez_contato)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_vale_pena ON clientes(vale_pena_contato)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_empresa ON clientes(empresa)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_nome ON clientes(nome)');
  });
}

module.exports = db;
