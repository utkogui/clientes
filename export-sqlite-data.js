const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Configuração do SQLite (local)
const sqliteDb = new sqlite3.Database(path.join(__dirname, 'server/clientes.db'));

async function exportData() {
  try {
    console.log('🔄 Exportando dados do SQLite...');
    
    // Buscar todos os dados do SQLite
    const sqliteData = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM clientes', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`📊 Encontrados ${sqliteData.length} registros no SQLite`);

    // Salvar em arquivo JSON
    const exportData = {
      timestamp: new Date().toISOString(),
      total: sqliteData.length,
      data: sqliteData
    };

    const filename = `clientes-export-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));

    console.log(`✅ Dados exportados para: ${filename}`);
    console.log(`📁 Arquivo criado com ${sqliteData.length} registros`);

    // Mostrar estatísticas
    const stats = {
      total: sqliteData.length,
      comWhatsApp: sqliteData.filter(c => c.tem_whatsapp).length,
      fezContato: sqliteData.filter(c => c.fez_contato).length,
      valePena: sqliteData.filter(c => c.vale_pena_contato).length,
      ativos: sqliteData.filter(c => c.status === 'ativo').length,
      inativos: sqliteData.filter(c => c.status === 'inativo').length
    };

    console.log('\n📈 Estatísticas dos dados exportados:');
    console.log(`   Total: ${stats.total}`);
    console.log(`   Com WhatsApp: ${stats.comWhatsApp}`);
    console.log(`   Fizeram Contato: ${stats.fezContato}`);
    console.log(`   Vale a Pena: ${stats.valePena}`);
    console.log(`   Ativos: ${stats.ativos}`);
    console.log(`   Inativos: ${stats.inativos}`);

  } catch (error) {
    console.error('❌ Erro na exportação:', error);
  } finally {
    sqliteDb.close();
    console.log('🔌 Conexão SQLite fechada');
  }
}

// Executar exportação
exportData();
