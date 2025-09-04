#!/usr/bin/env node

const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuração do PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/clientes',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateToPostgreSQL() {
  console.log('🚀 Iniciando migração do SQLite para PostgreSQL...');
  
  try {
    // 1. Conectar ao SQLite
    const sqliteDb = new sqlite3.Database('./clientes.db');
    console.log('✅ Conectado ao SQLite');

    // 2. Criar tabela no PostgreSQL
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

    // 3. Criar índices
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_status ON clientes(status)',
      'CREATE INDEX IF NOT EXISTS idx_whatsapp ON clientes(tem_whatsapp)',
      'CREATE INDEX IF NOT EXISTS idx_contato ON clientes(fez_contato)',
      'CREATE INDEX IF NOT EXISTS idx_vale_pena ON clientes(vale_pena_contato)',
      'CREATE INDEX IF NOT EXISTS idx_empresa ON clientes(empresa)',
      'CREATE INDEX IF NOT EXISTS idx_nome ON clientes(nome)',
      'CREATE INDEX IF NOT EXISTS idx_email ON clientes(email)',
      'CREATE INDEX IF NOT EXISTS idx_telefone ON clientes(telefone)'
    ];

    for (const indexQuery of indexes) {
      await pool.query(indexQuery);
    }

    console.log('✅ Tabela e índices criados no PostgreSQL');

    // 4. Verificar se já existem dados
    const countResult = await pool.query('SELECT COUNT(*) as count FROM clientes');
    if (countResult.rows[0].count > 0) {
      console.log('⚠️  PostgreSQL já possui dados. Deseja continuar? (y/N)');
      // Em produção, assumir que quer continuar
      if (process.env.NODE_ENV === 'production') {
        console.log('🔄 Continuando migração em produção...');
      } else {
        console.log('❌ Migração cancelada.');
        return;
      }
    }

    // 5. Buscar dados do SQLite
    const sqliteData = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM clientes ORDER BY id', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`📊 Encontrados ${sqliteData.length} registros no SQLite`);

    if (sqliteData.length === 0) {
      console.log('⚠️  Nenhum dado encontrado no SQLite');
      return;
    }

    // 6. Migrar dados
    let migrated = 0;
    let errors = 0;

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
        migrated++;
        
        if (migrated % 100 === 0) {
          console.log(`📈 Migrados ${migrated}/${sqliteData.length} registros...`);
        }
      } catch (err) {
        console.error(`❌ Erro ao migrar registro ${row.id}:`, err.message);
        errors++;
      }
    }

    // 7. Verificar migração
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM clientes');
    console.log('\n🎉 Migração concluída!');
    console.log(`✅ Registros migrados: ${migrated}`);
    console.log(`❌ Erros: ${errors}`);
    console.log(`📊 Total no PostgreSQL: ${finalCount.rows[0].count}`);

    // 8. Estatísticas
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN tem_whatsapp = true THEN 1 END) as com_whatsapp,
        COUNT(CASE WHEN vale_pena_contato = true THEN 1 END) as vale_pena,
        COUNT(CASE WHEN telefone IS NOT NULL AND telefone != '' THEN 1 END) as com_telefone
      FROM clientes
    `);

    console.log('\n📊 Estatísticas finais:');
    console.log(`   Total: ${stats.rows[0].total}`);
    console.log(`   Com WhatsApp: ${stats.rows[0].com_whatsapp}`);
    console.log(`   Vale Pena: ${stats.rows[0].vale_pena}`);
    console.log(`   Com Telefone: ${stats.rows[0].com_telefone}`);

  } catch (err) {
    console.error('❌ Erro na migração:', err);
    process.exit(1);
  } finally {
    sqliteDb.close();
    await pool.end();
  }
}

// Executar migração
if (require.main === module) {
  migrateToPostgreSQL();
}

module.exports = migrateToPostgreSQL;
