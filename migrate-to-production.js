const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuração do PostgreSQL (produção)
const pool = new Pool({
  connectionString: 'postgresql://clientes_db_i6qq_user:o2WLTruLXW54kt7CdlSKHwPW5oq6GkDp@dpg-d2st1m75r7bs73bnbqdg-a/clientes_db_i6qq',
  ssl: { rejectUnauthorized: false }
});

// Configuração do SQLite (local)
const sqliteDb = new sqlite3.Database(path.join(__dirname, 'server/clientes.db'));

async function migrateData() {
  try {
    console.log('🔄 Iniciando migração do SQLite para PostgreSQL...');
    
    // 1. Criar tabela no PostgreSQL se não existir
    console.log('📋 Criando tabela no PostgreSQL...');
    await pool.query(`
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

    // 2. Criar índices
    console.log('🔍 Criando índices...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_status ON clientes(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_whatsapp ON clientes(tem_whatsapp)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_contato ON clientes(fez_contato)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_vale_pena ON clientes(vale_pena_contato)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_empresa ON clientes(empresa)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_nome ON clientes(nome)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_email ON clientes(email)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_telefone ON clientes(telefone)');

    // 3. Limpar dados existentes no PostgreSQL (opcional)
    console.log('🧹 Limpando dados existentes no PostgreSQL...');
    await pool.query('DELETE FROM clientes');

    // 4. Buscar todos os dados do SQLite
    console.log('📊 Buscando dados do SQLite...');
    const sqliteData = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM clientes', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`📈 Encontrados ${sqliteData.length} registros no SQLite`);

    // 5. Inserir dados no PostgreSQL
    console.log('💾 Inserindo dados no PostgreSQL...');
    let inseridos = 0;
    
    for (const row of sqliteData) {
      try {
        await pool.query(`
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
        inseridos++;
        
        if (inseridos % 100 === 0) {
          console.log(`✅ Inseridos ${inseridos}/${sqliteData.length} registros...`);
        }
      } catch (err) {
        console.error(`❌ Erro ao inserir registro ${row.id}:`, err.message);
      }
    }

    // 6. Verificar resultado
    const countResult = await pool.query('SELECT COUNT(*) as count FROM clientes');
    const totalPostgres = countResult.rows[0].count;

    console.log(`\n🎉 Migração concluída com sucesso!`);
    console.log(`📊 SQLite: ${sqliteData.length} registros`);
    console.log(`📊 PostgreSQL: ${totalPostgres} registros`);
    console.log(`✅ Taxa de sucesso: ${((totalPostgres / sqliteData.length) * 100).toFixed(2)}%`);

  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    // Fechar conexões
    sqliteDb.close();
    await pool.end();
    console.log('🔌 Conexões fechadas');
  }
}

// Executar migração
migrateData();
