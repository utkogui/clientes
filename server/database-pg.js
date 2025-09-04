const { Pool } = require('pg');

// Configuração do PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/clientes',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Função para executar queries
const query = (text, params) => pool.query(text, params);

// Função para executar transações
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Criar tabela de clientes
const createTable = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome TEXT,
        email TEXT,
        telefone TEXT,
        empresa TEXT,
        tem_whatsapp BOOLEAN DEFAULT false,
        status TEXT DEFAULT 'ativo' CHECK(status IN ('ativo', 'inativo')),
        fez_contato BOOLEAN DEFAULT false,
        vale_pena_contato BOOLEAN DEFAULT false,
        data_contato TEXT,
        observacoes TEXT,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar índices para melhor performance
    await query('CREATE INDEX IF NOT EXISTS idx_status ON clientes(status)');
    await query('CREATE INDEX IF NOT EXISTS idx_whatsapp ON clientes(tem_whatsapp)');
    await query('CREATE INDEX IF NOT EXISTS idx_contato ON clientes(fez_contato)');
    await query('CREATE INDEX IF NOT EXISTS idx_vale_pena ON clientes(vale_pena_contato)');
    await query('CREATE INDEX IF NOT EXISTS idx_empresa ON clientes(empresa)');
    await query('CREATE INDEX IF NOT EXISTS idx_nome ON clientes(nome)');
    await query('CREATE INDEX IF NOT EXISTS idx_email ON clientes(email)');
    await query('CREATE INDEX IF NOT EXISTS idx_telefone ON clientes(telefone)');

    console.log('✅ Tabela clientes criada com sucesso no PostgreSQL');
  } catch (err) {
    console.error('❌ Erro ao criar tabela:', err);
    throw err;
  }
};

// Função para migrar dados do SQLite para PostgreSQL
const migrateFromSQLite = async () => {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  
  const sqliteDb = new sqlite3.Database(path.join(__dirname, 'clientes.db'));
  
  try {
    // Verificar se já existem dados no PostgreSQL
    const countResult = await query('SELECT COUNT(*) as count FROM clientes');
    if (countResult.rows[0].count > 0) {
      console.log('⚠️  PostgreSQL já possui dados. Pulando migração.');
      return;
    }

    console.log('🔄 Iniciando migração do SQLite para PostgreSQL...');
    
    // Buscar todos os dados do SQLite
    const sqliteData = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM clientes', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`📊 Encontrados ${sqliteData.length} registros no SQLite`);

    // Inserir dados no PostgreSQL
    for (const row of sqliteData) {
      await query(`
        INSERT INTO clientes (
          nome, email, telefone, empresa, tem_whatsapp, 
          status, fez_contato, vale_pena_contato, 
          data_contato, observacoes, data_criacao, data_atualizacao
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        row.nome || null,
        row.email || null,
        row.telefone || null,
        row.empresa || null,
        Boolean(row.tem_whatsapp),
        row.status || 'ativo',
        Boolean(row.fez_contato),
        Boolean(row.vale_pena_contato),
        row.data_contato || null,
        row.observacoes || null,
        row.data_criacao || new Date(),
        row.data_atualizacao || new Date()
      ]);
    }

    console.log(`✅ Migração concluída! ${sqliteData.length} registros migrados.`);
    
  } catch (err) {
    console.error('❌ Erro na migração:', err);
    throw err;
  } finally {
    sqliteDb.close();
  }
};

// Inicializar banco
const initializeDatabase = async () => {
  try {
    await createTable();
    
    // Se estiver em desenvolvimento e existir SQLite, migrar dados
    if (process.env.NODE_ENV !== 'production' && require('fs').existsSync('./clientes.db')) {
      await migrateFromSQLite();
    }
  } catch (err) {
    console.error('❌ Erro ao inicializar banco:', err);
    throw err;
  }
};

module.exports = {
  query,
  transaction,
  pool,
  initializeDatabase
};
