const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const VCFParser = require('./vcfParser');

// Função para carregar dados do VCF automaticamente
const carregarDadosVCF = async () => {
  try {
    console.log('🔄 Iniciando carregamento automático do VCF...');
    const vcfPath = path.join(__dirname, '../Contatos.vcf');
    
    // Verificar se o arquivo existe
    const fs = require('fs');
    if (!fs.existsSync(vcfPath)) {
      console.error('❌ Arquivo VCF não encontrado em:', vcfPath);
      return;
    }
    
    console.log('📁 Arquivo VCF encontrado:', vcfPath);
    const contatos = VCFParser.parseVCF(vcfPath);
    console.log(`📊 Total de contatos no VCF: ${contatos.length}`);
    
    let importados = 0;
    let duplicados = 0;
    
    for (const contato of contatos) {
      // Importar se tem telefone OU email (não ambos obrigatórios)
      if (contato.telefone || contato.email) {
        // Verificar se já existe por telefone ou email
        let query, params;
        
        if (contato.telefone && contato.email) {
          // Tem ambos: verificar por telefone OU email
          query = 'SELECT id FROM clientes WHERE telefone = ? OR email = ?';
          params = [contato.telefone, contato.email];
        } else if (contato.telefone) {
          // Só tem telefone: verificar por telefone
          query = 'SELECT id FROM clientes WHERE telefone = ?';
          params = [contato.telefone];
        } else {
          // Só tem email: verificar por email
          query = 'SELECT id FROM clientes WHERE email = ?';
          params = [contato.email];
        }
        
        const row = await db.get(query, params);
        
        if (!row) {
          // Inserir novo cliente
          await db.run(
            'INSERT INTO clientes (nome, email, telefone, empresa, tem_whatsapp) VALUES (?, ?, ?, ?, ?)',
            [
              contato.nome || '', 
              contato.email || '', 
              contato.telefone || '', 
              contato.empresa || '', 
              contato.telefone ? 1 : 0
            ]
          );
          importados++;
        } else {
          // Cliente já existe - atualizar apenas informações básicas, preservando dados importantes
          await db.run(
            `UPDATE clientes SET 
              nome = COALESCE(?, nome),
              email = COALESCE(?, email),
              telefone = COALESCE(?, telefone),
              empresa = COALESCE(?, empresa),
              tem_whatsapp = CASE WHEN ? = 1 THEN 1 ELSE tem_whatsapp END,
              data_atualizacao = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
              contato.nome || null, 
              contato.email || null, 
              contato.telefone || null, 
              contato.empresa || null, 
              contato.telefone ? 1 : 0,
              row.id
            ]
          );
          duplicados++;
        }
      }
    }
    
    console.log(`✅ Carregamento automático concluído: ${importados} novos clientes, ${duplicados} clientes existentes atualizados`);
  } catch (error) {
    console.error('❌ Erro no carregamento automático do VCF:', error);
    console.error('Stack trace:', error.stack);
  }
};

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

// Log de startup
console.log('🚀 Servidor iniciando...');
console.log('🌍 Ambiente:', process.env.NODE_ENV || 'desenvolvimento');
console.log('📁 Diretório atual:', __dirname);

// Carregar dados do VCF automaticamente ao iniciar o servidor (não bloqueia)
console.log('🔄 Iniciando carregamento automático do VCF...');
carregarDadosVCF().catch(err => {
  console.error('❌ Erro crítico no carregamento do VCF:', err);
  console.error('Stack trace:', err.stack);
});

// Rota para visualizador do banco de dados
app.get('/database-viewer', (req, res) => {
  res.sendFile(path.join(__dirname, '../database-viewer.html'));
});

// Rota de debug para verificar status do VCF
app.get('/api/debug-vcf', (req, res) => {
  try {
    const vcfPath = path.join(__dirname, '../Contatos.vcf');
    const fs = require('fs');
    const exists = fs.existsSync(vcfPath);
    
    res.json({
      vcfPath,
      exists,
      size: exists ? fs.statSync(vcfPath).size : 0,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'desenvolvimento',
      currentDir: __dirname
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota para forçar carregamento do VCF
app.post('/api/force-load-vcf', async (req, res) => {
  try {
    console.log('🔄 Forçando carregamento do VCF via API...');
    await carregarDadosVCF();
    res.json({ success: true, message: 'VCF carregado com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao forçar carregamento:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rota para verificar status do banco
app.get('/api/debug-db', async (req, res) => {
  try {
    const count = await db.get('SELECT COUNT(*) as count FROM clientes');
    res.json({
      totalClientes: count.count,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'desenvolvimento'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota para importar dados do JSON
app.post('/api/import-json-data', async (req, res) => {
  try {
    console.log('🔄 Iniciando importação de dados JSON...');
    
    // Ler arquivo JSON local
    const fs = require('fs');
    const filename = path.join(__dirname, '../clientes-export-2025-09-04.json');
    
    if (!fs.existsSync(filename)) {
      return res.status(404).json({ error: 'Arquivo JSON não encontrado' });
    }
    
    const jsonData = JSON.parse(fs.readFileSync(filename, 'utf8'));
    const clientes = jsonData.data;
    
    console.log(`📊 Carregados ${clientes.length} registros do arquivo JSON`);
    
    // Limpar dados existentes
    await db.run('DELETE FROM clientes');
    console.log('🧹 Dados existentes removidos');
    
    // Inserir novos dados
    let inseridos = 0;
    for (const row of clientes) {
      try {
        await db.run(`
          INSERT INTO clientes (
            nome, email, telefone, empresa, tem_whatsapp, 
            status, fez_contato, vale_pena_contato, 
            data_contato, observacoes, data_criacao, data_atualizacao
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    
    // Verificar resultado
    const count = await db.get('SELECT COUNT(*) as count FROM clientes');
    
    console.log(`🎉 Importação concluída: ${inseridos} registros inseridos`);
    
    res.json({
      success: true,
      message: `Importação concluída com sucesso!`,
      total: clientes.length,
      inseridos: inseridos,
      finalCount: count.count
    });
    
  } catch (error) {
    console.error('❌ Erro na importação JSON:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar todos os clientes
app.get('/api/clientes', (req, res) => {
  const { status, tem_whatsapp, fez_contato, vale_pena_contato, busca, sem_telefone, page = 1, limit = 50 } = req.query;
  
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  let query = 'SELECT * FROM clientes WHERE 1=1';
  let countQuery = 'SELECT COUNT(*) as total FROM clientes WHERE 1=1';
  const params = [];
  const countParams = [];
  
  if (status) {
    query += ' AND status = ?';
    countQuery += ' AND status = ?';
    params.push(status);
    countParams.push(status);
  }
  
  if (tem_whatsapp !== undefined) {
    query += ' AND tem_whatsapp = ?';
    countQuery += ' AND tem_whatsapp = ?';
    params.push(tem_whatsapp === 'true' ? 1 : 0);
    countParams.push(tem_whatsapp === 'true' ? 1 : 0);
  }
  
  if (fez_contato !== undefined) {
    query += ' AND fez_contato = ?';
    countQuery += ' AND fez_contato = ?';
    params.push(fez_contato === 'true' ? 1 : 0);
    countParams.push(fez_contato === 'true' ? 1 : 0);
  }
  
  if (vale_pena_contato !== undefined) {
    query += ' AND vale_pena_contato = ?';
    countQuery += ' AND vale_pena_contato = ?';
    params.push(vale_pena_contato === 'true' ? 1 : 0);
    countParams.push(vale_pena_contato === 'true' ? 1 : 0);
  }
  
  if (sem_telefone === 'true') {
    query += ' AND (telefone IS NULL OR telefone = "" OR telefone = "-")';
    countQuery += ' AND (telefone IS NULL OR telefone = "" OR telefone = "-")';
  }
  
  if (busca) {
    query += ' AND (nome LIKE ? OR email LIKE ? OR telefone LIKE ? OR empresa LIKE ?)';
    countQuery += ' AND (nome LIKE ? OR email LIKE ? OR telefone LIKE ? OR empresa LIKE ?)';
    const searchTerm = `%${busca}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }
  
  query += ' ORDER BY data_criacao DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);
  
  // Buscar total de registros
  db.get(countQuery, countParams, (err, countRow) => {
    if (err) {
      console.error('Erro ao contar clientes:', err);
      res.status(500).json({ erro: 'Erro interno do servidor' });
      return;
    }
    
    const total = countRow.total;
    
    // Buscar clientes paginados
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Erro ao buscar clientes:', err);
        res.status(500).json({ erro: 'Erro interno do servidor' });
      } else {
        res.json({
          clientes: rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: total,
            totalPages: Math.ceil(total / parseInt(limit))
          }
        });
      }
    });
  });
});

// Buscar cliente por ID
app.get('/api/clientes/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM clientes WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Erro ao buscar cliente:', err);
      res.status(500).json({ erro: 'Erro interno do servidor' });
    } else if (!row) {
      res.status(404).json({ erro: 'Cliente não encontrado' });
    } else {
      res.json(row);
    }
  });
});

// Atualizar cliente
app.put('/api/clientes/:id', (req, res) => {
  const { id } = req.params;
  const { nome, email, telefone, empresa, tem_whatsapp, status, fez_contato, vale_pena_contato, observacoes } = req.body;
  
  const query = `
    UPDATE clientes 
    SET nome = ?, email = ?, telefone = ?, empresa = ?, tem_whatsapp = ?, 
        status = ?, fez_contato = ?, vale_pena_contato = ?, observacoes = ?, data_atualizacao = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  
  db.run(query, [nome, email, telefone, empresa, tem_whatsapp ? 1 : 0, status, fez_contato ? 1 : 0, vale_pena_contato ? 1 : 0, observacoes, id], function(err) {
    if (err) {
      console.error('Erro ao atualizar cliente:', err);
      res.status(500).json({ erro: 'Erro interno do servidor' });
    } else if (this.changes === 0) {
      res.status(404).json({ erro: 'Cliente não encontrado' });
    } else {
      res.json({ sucesso: true, mensagem: 'Cliente atualizado com sucesso' });
    }
  });
});

// Atualizar apenas vale_pena_contato
app.patch('/api/clientes/:id/vale-pena', (req, res) => {
  const { id } = req.params;
  const { vale_pena_contato } = req.body;
  
  db.run('UPDATE clientes SET vale_pena_contato = ?, data_atualizacao = CURRENT_TIMESTAMP WHERE id = ?', 
    [vale_pena_contato ? 1 : 0, id], function(err) {
    if (err) {
      console.error('Erro ao atualizar vale_pena_contato:', err);
      res.status(500).json({ erro: 'Erro interno do servidor' });
    } else if (this.changes === 0) {
      res.status(404).json({ erro: 'Cliente não encontrado' });
    } else {
      res.json({ sucesso: true, mensagem: 'Status atualizado com sucesso' });
    }
  });
});

// Deletar cliente
app.delete('/api/clientes/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM clientes WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Erro ao deletar cliente:', err);
      res.status(500).json({ erro: 'Erro interno do servidor' });
    } else if (this.changes === 0) {
      res.status(404).json({ erro: 'Cliente não encontrado' });
    } else {
      res.json({ sucesso: true, mensagem: 'Cliente deletado com sucesso' });
    }
  });
});

// Estatísticas
app.get('/api/estatisticas', (req, res) => {
  const queries = [
    'SELECT COUNT(*) as total FROM clientes',
    'SELECT COUNT(*) as ativos FROM clientes WHERE status = "ativo"',
    'SELECT COUNT(*) as inativos FROM clientes WHERE status = "inativo"',
    'SELECT COUNT(*) as com_whatsapp FROM clientes WHERE tem_whatsapp = 1',
    'SELECT COUNT(*) as contatados FROM clientes WHERE fez_contato = 1',
    'SELECT COUNT(*) as sem_telefone FROM clientes WHERE (telefone IS NULL OR telefone = "" OR telefone = "-")',
    'SELECT COUNT(*) as vale_pena FROM clientes WHERE vale_pena_contato = 1'
  ];
  
  Promise.all(queries.map(query => 
    new Promise((resolve, reject) => {
      db.get(query, [], (err, row) => {
        if (err) reject(err);
        else resolve(Object.values(row)[0]);
      });
    })
  )).then(([total, ativos, inativos, com_whatsapp, contatados, sem_telefone, vale_pena]) => {
    res.json({
      total,
      ativos,
      inativos,
      com_whatsapp,
      contatados,
      sem_contato: total - contatados,
      sem_telefone,
      vale_pena
    });
  }).catch(err => {
    console.error('Erro ao buscar estatísticas:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  });
});

// Servir a aplicação React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
  console.log(`🔧 Ambiente: ${process.env.NODE_ENV || 'desenvolvimento'}`);
  console.log(`📁 Diretório: ${__dirname}`);
  console.log(`⏰ Iniciado em: ${new Date().toISOString()}`);
});
