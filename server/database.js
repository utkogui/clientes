const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'clientes.db');
const db = new sqlite3.Database(dbPath);

// Criar tabela de clientes
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS clientes (
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

  // Adicionar coluna empresa se não existir (para bancos existentes)
  db.run(`ALTER TABLE clientes ADD COLUMN empresa TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Erro ao adicionar coluna empresa:', err);
    }
  });

  // Adicionar coluna vale_pena_contato se não existir (para bancos existentes)
  db.run(`ALTER TABLE clientes ADD COLUMN vale_pena_contato BOOLEAN DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Erro ao adicionar coluna vale_pena_contato:', err);
    }
  });

  // Criar índices para melhor performance
  db.run('CREATE INDEX IF NOT EXISTS idx_status ON clientes(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_whatsapp ON clientes(tem_whatsapp)');
  db.run('CREATE INDEX IF NOT EXISTS idx_contato ON clientes(fez_contato)');
  db.run('CREATE INDEX IF NOT EXISTS idx_vale_pena ON clientes(vale_pena_contato)');
  db.run('CREATE INDEX IF NOT EXISTS idx_empresa ON clientes(empresa)');
  db.run('CREATE INDEX IF NOT EXISTS idx_nome ON clientes(nome)');
});

module.exports = db;
