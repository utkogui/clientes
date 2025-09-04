const { Pool } = require('pg');
const fs = require('fs');

// Configuração do PostgreSQL (produção)
const pool = new Pool({
  connectionString: 'postgresql://clientes_db_i6qq_user:o2WLTruLXW54kt7CdlSKHwPW5oq6GkDp@dpg-d2st1m75r7bs73bnbqdg-a/clientes_db_i6qq',
  ssl: { rejectUnauthorized: false }
});

async function importData() {
  try {
    console.log('🔄 Iniciando importação para PostgreSQL...');
    
    // 1. Ler arquivo JSON
    const filename = 'clientes-export-2025-09-04.json';
    if (!fs.existsSync(filename)) {
      throw new Error(`Arquivo ${filename} não encontrado`);
    }
    
    const jsonData = JSON.parse(fs.readFileSync(filename, 'utf8'));
    const clientes = jsonData.data;
    
    console.log(`📊 Carregados ${clientes.length} registros do arquivo JSON`);
    
    // 2. Criar tabela no PostgreSQL se não existir
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

    // 3. Criar índices
    console.log('🔍 Criando índices...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_status ON clientes(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_whatsapp ON clientes(tem_whatsapp)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_contato ON clientes(fez_contato)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_vale_pena ON clientes(vale_pena_contato)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_empresa ON clientes(empresa)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_nome ON clientes(nome)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_email ON clientes(email)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_telefone ON clientes(telefone)');

    // 4. Limpar dados existentes no PostgreSQL
    console.log('🧹 Limpando dados existentes no PostgreSQL...');
    await pool.query('DELETE FROM clientes');

    // 5. Inserir dados no PostgreSQL
    console.log('💾 Inserindo dados no PostgreSQL...');
    let inseridos = 0;
    
    for (const row of clientes) {
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
          console.log(`✅ Inseridos ${inseridos}/${clientes.length} registros...`);
        }
      } catch (err) {
        console.error(`❌ Erro ao inserir registro ${row.id}:`, err.message);
      }
    }

    // 6. Verificar resultado
    const countResult = await pool.query('SELECT COUNT(*) as count FROM clientes');
    const totalPostgres = countResult.rows[0].count;

    console.log(`\n🎉 Importação concluída com sucesso!`);
    console.log(`📊 JSON: ${clientes.length} registros`);
    console.log(`📊 PostgreSQL: ${totalPostgres} registros`);
    console.log(`✅ Taxa de sucesso: ${((totalPostgres / clientes.length) * 100).toFixed(2)}%`);

    // 7. Mostrar estatísticas finais
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN tem_whatsapp = true THEN 1 END) as com_whatsapp,
        COUNT(CASE WHEN fez_contato = true THEN 1 END) as fez_contato,
        COUNT(CASE WHEN vale_pena_contato = true THEN 1 END) as vale_pena,
        COUNT(CASE WHEN status = 'ativo' THEN 1 END) as ativos,
        COUNT(CASE WHEN status = 'inativo' THEN 1 END) as inativos
      FROM clientes
    `);

    const finalStats = stats.rows[0];
    console.log('\n📈 Estatísticas finais no PostgreSQL:');
    console.log(`   Total: ${finalStats.total}`);
    console.log(`   Com WhatsApp: ${finalStats.com_whatsapp}`);
    console.log(`   Fizeram Contato: ${finalStats.fez_contato}`);
    console.log(`   Vale a Pena: ${finalStats.vale_pena}`);
    console.log(`   Ativos: ${finalStats.ativos}`);
    console.log(`   Inativos: ${finalStats.inativos}`);

  } catch (error) {
    console.error('❌ Erro na importação:', error);
  } finally {
    await pool.end();
    console.log('🔌 Conexão PostgreSQL fechada');
  }
}

// Executar importação
importData();
