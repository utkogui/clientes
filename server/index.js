const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
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

// Importar contatos do arquivo VCF
app.post('/api/importar-contatos', (req, res) => {
  try {
    const vcfPath = path.join(__dirname, '../Contatos.vcf');
    const contatos = VCFParser.parseVCF(vcfPath);
    
    let importados = 0;
    let duplicados = 0;
    
    contatos.forEach(contato => {
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
        
        db.get(query, params, (err, row) => {
          if (err) {
            console.error('Erro ao verificar duplicata:', err);
            return;
          }
          
          if (!row) {
            // Inserir novo cliente
            db.run(
              'INSERT INTO clientes (nome, email, telefone, empresa, tem_whatsapp) VALUES (?, ?, ?, ?, ?)',
              [
                contato.nome || '', 
                contato.email || '', 
                contato.telefone || '', 
                contato.empresa || '', 
                contato.telefone ? 1 : 0
              ],
              function(err) {
                if (err) {
                  console.error('Erro ao inserir cliente:', err);
                } else {
                  importados++;
                }
              }
            );
          } else {
            duplicados++;
          }
        });
      }
    });
    
    // Aguardar um pouco para as operações assíncronas terminarem
    setTimeout(() => {
      res.json({
        sucesso: true,
        total: contatos.length,
        importados,
        duplicados,
        mensagem: `Importação concluída: ${importados} novos clientes, ${duplicados} duplicados ignorados`
      });
    }, 2000);
    
  } catch (error) {
    console.error('Erro na importação:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
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
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
});
