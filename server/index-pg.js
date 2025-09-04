const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database-pg');
const VCFParser = require('./vcfParser');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

// Rota para visualizador do banco de dados
app.get('/database-viewer', (req, res) => {
  res.sendFile(path.join(__dirname, '../database-viewer.html'));
});

// Inicializar banco de dados
db.initializeDatabase().then(() => {
  console.log('✅ Banco PostgreSQL inicializado com sucesso');
}).catch(err => {
  console.error('❌ Erro ao inicializar banco:', err);
});

// Importar contatos do arquivo VCF
app.post('/api/importar-contatos', async (req, res) => {
  try {
    const vcfPath = path.join(__dirname, '../Contatos.vcf');
    const contatos = VCFParser.parseVCF(vcfPath);
    
    let importados = 0;
    let duplicados = 0;
    
    for (const contato of contatos) {
      // Importar se tem telefone OU email (não ambos obrigatórios)
      if (contato.telefone || contato.email) {
        // Verificar se já existe por telefone ou email
        let query, params;
        
        if (contato.telefone && contato.email) {
          // Tem ambos: verificar por telefone OU email
          query = 'SELECT id FROM clientes WHERE telefone = $1 OR email = $2';
          params = [contato.telefone, contato.email];
        } else if (contato.telefone) {
          // Só tem telefone: verificar por telefone
          query = 'SELECT id FROM clientes WHERE telefone = $1';
          params = [contato.telefone];
        } else {
          // Só tem email: verificar por email
          query = 'SELECT id FROM clientes WHERE email = $1';
          params = [contato.email];
        }
        
        const existingClient = await db.query(query, params);
        
        if (existingClient.rows.length === 0) {
          // Inserir novo cliente
          await db.query(
            'INSERT INTO clientes (nome, email, telefone, empresa, tem_whatsapp) VALUES ($1, $2, $3, $4, $5)',
            [
              contato.nome || '', 
              contato.email || '', 
              contato.telefone || '', 
              contato.empresa || '', 
              contato.telefone ? true : false
            ]
          );
          importados++;
        } else {
          duplicados++;
        }
      }
    }
    
    res.json({
      sucesso: true,
      mensagem: `Importação concluída! ${importados} contatos importados, ${duplicados} duplicados ignorados.`,
      importados,
      duplicados
    });
  } catch (error) {
    console.error('Erro na importação:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

// Listar todos os clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const { status, tem_whatsapp, fez_contato, vale_pena_contato, busca, sem_telefone, page = 1, limit = 50 } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = 'SELECT * FROM clientes WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM clientes WHERE 1=1';
    const params = [];
    const countParams = [];
    let paramCount = 0;
    
    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      countQuery += ` AND status = $${paramCount}`;
      params.push(status);
      countParams.push(status);
    }
    
    if (tem_whatsapp !== undefined) {
      paramCount++;
      query += ` AND tem_whatsapp = $${paramCount}`;
      countQuery += ` AND tem_whatsapp = $${paramCount}`;
      params.push(tem_whatsapp === 'true');
      countParams.push(tem_whatsapp === 'true');
    }
    
    if (fez_contato !== undefined) {
      paramCount++;
      query += ` AND fez_contato = $${paramCount}`;
      countQuery += ` AND fez_contato = $${paramCount}`;
      params.push(fez_contato === 'true');
      countParams.push(fez_contato === 'true');
    }
    
    if (vale_pena_contato !== undefined) {
      paramCount++;
      query += ` AND vale_pena_contato = $${paramCount}`;
      countQuery += ` AND vale_pena_contato = $${paramCount}`;
      params.push(vale_pena_contato === 'true');
      countParams.push(vale_pena_contato === 'true');
    }
    
    if (sem_telefone === 'true') {
      query += ' AND (telefone IS NULL OR telefone = \'\' OR telefone = \'-\')';
      countQuery += ' AND (telefone IS NULL OR telefone = \'\' OR telefone = \'-\')';
    }
    
    if (busca) {
      paramCount++;
      query += ` AND (nome ILIKE $${paramCount} OR email ILIKE $${paramCount} OR telefone ILIKE $${paramCount} OR empresa ILIKE $${paramCount})`;
      countQuery += ` AND (nome ILIKE $${paramCount} OR email ILIKE $${paramCount} OR telefone ILIKE $${paramCount} OR empresa ILIKE $${paramCount})`;
      const searchTerm = `%${busca}%`;
      params.push(searchTerm);
      countParams.push(searchTerm);
    }
    
    query += ' ORDER BY id DESC';
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);
    
    const [clientesResult, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams)
    ]);
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / parseInt(limit));
    
    res.json({
      clientes: clientesResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Buscar cliente por ID
app.get('/api/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query('SELECT * FROM clientes WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ erro: 'Cliente não encontrado' });
    } else {
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Atualizar cliente
app.put('/api/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, telefone, empresa, tem_whatsapp, status, fez_contato, vale_pena_contato, observacoes } = req.body;
    
    const query = `
      UPDATE clientes 
      SET nome = $1, email = $2, telefone = $3, empresa = $4, tem_whatsapp = $5, 
          status = $6, fez_contato = $7, vale_pena_contato = $8, observacoes = $9, data_atualizacao = CURRENT_TIMESTAMP
      WHERE id = $10
    `;
    
    const result = await db.query(query, [
      nome, email, telefone, empresa, tem_whatsapp, 
      status, fez_contato, vale_pena_contato, observacoes, id
    ]);
    
    if (result.rowCount === 0) {
      res.status(404).json({ erro: 'Cliente não encontrado' });
    } else {
      res.json({ sucesso: true, mensagem: 'Cliente atualizado com sucesso' });
    }
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Atualizar apenas vale_pena_contato
app.patch('/api/clientes/:id/vale-pena', async (req, res) => {
  try {
    const { id } = req.params;
    const { vale_pena_contato } = req.body;
    
    const result = await db.query(
      'UPDATE clientes SET vale_pena_contato = $1, data_atualizacao = CURRENT_TIMESTAMP WHERE id = $2',
      [vale_pena_contato, id]
    );
    
    if (result.rowCount === 0) {
      res.status(404).json({ erro: 'Cliente não encontrado' });
    } else {
      res.json({ sucesso: true, mensagem: 'Status atualizado com sucesso' });
    }
  } catch (error) {
    console.error('Erro ao atualizar vale_pena_contato:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Deletar cliente
app.delete('/api/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query('DELETE FROM clientes WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      res.status(404).json({ erro: 'Cliente não encontrado' });
    } else {
      res.json({ sucesso: true, mensagem: 'Cliente deletado com sucesso' });
    }
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Estatísticas
app.get('/api/estatisticas', async (req, res) => {
  try {
    const queries = [
      'SELECT COUNT(*) as total FROM clientes',
      'SELECT COUNT(*) as ativos FROM clientes WHERE status = \'ativo\'',
      'SELECT COUNT(*) as inativos FROM clientes WHERE status = \'inativo\'',
      'SELECT COUNT(*) as com_whatsapp FROM clientes WHERE tem_whatsapp = true',
      'SELECT COUNT(*) as contatados FROM clientes WHERE fez_contato = true',
      'SELECT COUNT(*) as sem_telefone FROM clientes WHERE (telefone IS NULL OR telefone = \'\' OR telefone = \'-\')',
      'SELECT COUNT(*) as vale_pena FROM clientes WHERE vale_pena_contato = true'
    ];
    
    const results = await Promise.all(queries.map(query => db.query(query)));
    
    res.json({
      total: parseInt(results[0].rows[0].total),
      ativos: parseInt(results[1].rows[0].ativos),
      inativos: parseInt(results[2].rows[0].inativos),
      com_whatsapp: parseInt(results[3].rows[0].com_whatsapp),
      contatados: parseInt(results[4].rows[0].contatados),
      sem_contato: parseInt(results[0].rows[0].total) - parseInt(results[4].rows[0].contatados),
      sem_telefone: parseInt(results[5].rows[0].sem_telefone),
      vale_pena: parseInt(results[6].rows[0].vale_pena)
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Rota para servir o frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Acesse: http://localhost:${PORT}`);
  console.log(`🗄️  Banco: PostgreSQL`);
});

module.exports = app;
