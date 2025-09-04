import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  UserCheck, 
  UserX, 
  MessageCircle, 
  Phone, 
  Search, 
  Filter,
  Download,
  Edit,
  Trash2,
  Plus,
  Edit3
} from 'lucide-react';
import ClientModal from './components/ClientModal';

function App() {
  const [clientes, setClientes] = useState([]);
  const [pagination, setPagination] = useState({});
  const [estatisticas, setEstatisticas] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Abas
  const [abaAtiva, setAbaAtiva] = useState('todos');
  
  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  
  // Filtros
  const [filtros, setFiltros] = useState({
    busca: '',
    status: '',
    tem_whatsapp: '',
    fez_contato: '',
    vale_pena_contato: ''
  });
  
  // Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  
  // Edição inline
  const [editandoEmpresa, setEditandoEmpresa] = useState(null);
  const [empresaTemp, setEmpresaTemp] = useState('');
  const [atualizandoCheckbox, setAtualizandoCheckbox] = useState(new Set());

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, [filtros, abaAtiva, paginaAtual]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      // Adicionar filtro baseado na aba ativa
      if (abaAtiva === 'sem_telefone') {
        params.append('sem_telefone', 'true');
      } else if (abaAtiva === 'vale_pena') {
        params.append('vale_pena_contato', 'true');
      }
      
      // Adicionar paginação
      params.append('page', paginaAtual);
      params.append('limit', '50');
      
      const [clientesRes, statsRes] = await Promise.all([
        axios.get(`/api/clientes?${params}`),
        axios.get('/api/estatisticas')
      ]);
      
      setClientes(clientesRes.data.clientes);
      setPagination(clientesRes.data.pagination);
      setEstatisticas(statsRes.data);
    } catch (err) {
      setError('Erro ao carregar dados: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const importarContatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post('/api/importar-contatos');
      setSuccess(response.data.mensagem);
      carregarDados();
    } catch (err) {
      setError('Erro ao importar contatos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const atualizarCliente = async (id, dados) => {
    try {
      await axios.put(`/api/clientes/${id}`, dados);
      setSuccess('Cliente atualizado com sucesso!');
      carregarDados();
      setModalAberto(false);
      setClienteEditando(null);
    } catch (err) {
      setError('Erro ao atualizar cliente: ' + err.message);
    }
  };

  const deletarCliente = async (id) => {
    if (!confirm('Tem certeza que deseja deletar este cliente?')) return;
    
    try {
      await axios.delete(`/api/clientes/${id}`);
      setSuccess('Cliente deletado com sucesso!');
      carregarDados();
    } catch (err) {
      setError('Erro ao deletar cliente: ' + err.message);
    }
  };

  const abrirModalEdicao = (cliente) => {
    setClienteEditando(cliente);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setClienteEditando(null);
  };

  const limparFiltros = () => {
    setFiltros({
      busca: '',
      status: '',
      tem_whatsapp: '',
      fez_contato: '',
      vale_pena_contato: ''
    });
    setAbaAtiva('todos');
    setPaginaAtual(1);
  };

  const iniciarEdicaoEmpresa = (cliente) => {
    setEditandoEmpresa(cliente.id);
    setEmpresaTemp(cliente.empresa || '');
  };

  const salvarEmpresa = async (clienteId) => {
    try {
      const cliente = clientes.find(c => c.id === clienteId);
      if (!cliente) return;

      const dadosAtualizados = {
        ...cliente,
        empresa: empresaTemp
      };

      // Atualização otimista: atualiza a interface primeiro
      setClientes(prevClientes => 
        prevClientes.map(c => 
          c.id === clienteId 
            ? { ...c, empresa: empresaTemp }
            : c
        )
      );

      await axios.put(`/api/clientes/${clienteId}`, dadosAtualizados);
      setSuccess('Empresa atualizada com sucesso!');
      setEditandoEmpresa(null);
      setEmpresaTemp('');
    } catch (err) {
      // Se der erro, reverte a mudança
      setClientes(prevClientes => 
        prevClientes.map(c => 
          c.id === clienteId 
            ? { ...c, empresa: cliente.empresa }
            : c
        )
      );
      setError('Erro ao atualizar empresa: ' + err.message);
    }
  };

  const cancelarEdicaoEmpresa = () => {
    setEditandoEmpresa(null);
    setEmpresaTemp('');
  };

  const toggleValePena = async (clienteId, valorAtual) => {
    const novoValor = !valorAtual;
    
    // Marcar como atualizando
    setAtualizandoCheckbox(prev => new Set(prev).add(clienteId));
    
    // Atualização otimista: atualiza a interface primeiro
    setClientes(prevClientes => 
      prevClientes.map(cliente => 
        cliente.id === clienteId 
          ? { ...cliente, vale_pena_contato: novoValor }
          : cliente
      )
    );
    
    try {
      await axios.patch(`/api/clientes/${clienteId}/vale-pena`, {
        vale_pena_contato: novoValor
      });
      // Atualiza apenas as estatísticas, não recarrega toda a lista
      const statsRes = await axios.get('/api/estatisticas');
      setEstatisticas(statsRes.data);
      
      // Feedback visual sutil (sem mensagem de sucesso)
      // O checkbox já mostra visualmente que foi alterado
    } catch (err) {
      // Se der erro, reverte a mudança
      setClientes(prevClientes => 
        prevClientes.map(cliente => 
          cliente.id === clienteId 
            ? { ...cliente, vale_pena_contato: valorAtual }
            : cliente
        )
      );
      setError('Erro ao atualizar status: ' + err.message);
    } finally {
      // Remove do estado de atualizando
      setAtualizandoCheckbox(prev => {
        const newSet = new Set(prev);
        newSet.delete(clienteId);
        return newSet;
      });
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Sistema de Gerenciamento de Clientes</h1>
        <p>Gerencie seus contatos de forma eficiente</p>
        <div className="company-name">
          <span className="company-label">Empresa:</span>
          <span className="company-value">Sua Empresa</span>
        </div>
      </header>

      {error && (
        <div className="error">
          {error}
          <button onClick={() => setError(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {success && (
        <div className="success">
          {success}
          <button onClick={() => setSuccess(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Estatísticas */}
      <div className="stats-grid">
        <div className="stat-card">
          <Users size={32} color="#667eea" />
          <h3>{estatisticas.total || 0}</h3>
          <p>Total de Clientes</p>
        </div>
        <div className="stat-card">
          <UserCheck size={32} color="#10b981" />
          <h3>{estatisticas.ativos || 0}</h3>
          <p>Clientes Ativos</p>
        </div>
        <div className="stat-card">
          <UserX size={32} color="#ef4444" />
          <h3>{estatisticas.inativos || 0}</h3>
          <p>Clientes Inativos</p>
        </div>
        <div className="stat-card">
          <MessageCircle size={32} color="#059669" />
          <h3>{estatisticas.com_whatsapp || 0}</h3>
          <p>Com WhatsApp</p>
        </div>
        <div className="stat-card">
          <Phone size={32} color="#3b82f6" />
          <h3>{estatisticas.contatados || 0}</h3>
          <p>Já Contatados</p>
        </div>
        <div className="stat-card">
          <Phone size={32} color="#f59e0b" />
          <h3>{estatisticas.sem_telefone || 0}</h3>
          <p>Sem Telefone</p>
        </div>
        <div className="stat-card">
          <UserCheck size={32} color="#8b5cf6" />
          <h3>{estatisticas.vale_pena || 0}</h3>
          <p>Vale Pena Contato</p>
        </div>
      </div>

      {/* Abas */}
      <div className="tabs-container">
        <div className="tabs">
          <button 
            className={`tab ${abaAtiva === 'todos' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('todos')}
          >
            <Users size={16} />
            Todos os Clientes
          </button>
          <button 
            className={`tab ${abaAtiva === 'sem_telefone' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('sem_telefone')}
          >
            <Phone size={16} />
            Sem Telefone
          </button>
          <button 
            className={`tab ${abaAtiva === 'vale_pena' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('vale_pena')}
          >
            <UserCheck size={16} />
            ⭐ Vale a Pena ({estatisticas.vale_pena || 0})
          </button>
        </div>
      </div>

      {/* Controles */}
      <div className="controls">
        <div className="search-box">
          <Search size={20} color="#6b7280" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Buscar por nome, email ou telefone..."
            value={filtros.busca}
            onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
            style={{ paddingLeft: '40px' }}
          />
        </div>
        
        <div className="filter-group">
          <select
            className="filter-select"
            value={filtros.status}
            onChange={(e) => setFiltros({...filtros, status: e.target.value})}
          >
            <option value="">Todos os Status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
          
          <select
            className="filter-select"
            value={filtros.tem_whatsapp}
            onChange={(e) => setFiltros({...filtros, tem_whatsapp: e.target.value})}
          >
            <option value="">Todos WhatsApp</option>
            <option value="true">Com WhatsApp</option>
            <option value="false">Sem WhatsApp</option>
          </select>
          
          <select
            className="filter-select"
            value={filtros.fez_contato}
            onChange={(e) => setFiltros({...filtros, fez_contato: e.target.value})}
          >
            <option value="">Todos Contatos</option>
            <option value="true">Já Contatados</option>
            <option value="false">Não Contatados</option>
          </select>
          
          <select
            className="filter-select"
            value={filtros.vale_pena_contato}
            onChange={(e) => setFiltros({...filtros, vale_pena_contato: e.target.value})}
          >
            <option value="">Todos Vale Pena</option>
            <option value="true">⭐ Vale a Pena</option>
            <option value="false">❌ Não Vale Pena</option>
          </select>
          
          <button className="btn btn-secondary" onClick={limparFiltros}>
            <Filter size={16} />
            Limpar
          </button>
        </div>
        
        <button 
          className="btn btn-warning" 
          onClick={() => {
            setAbaAtiva('vale_pena');
            setPaginaAtual(1);
            setFiltros({
              busca: '',
              status: '',
              tem_whatsapp: '',
              fez_contato: '',
              vale_pena_contato: ''
            });
          }}
          style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}
        >
          ⭐ Ver Vale a Pena ({estatisticas.vale_pena || 0})
        </button>
        
        <button className="btn btn-success" onClick={importarContatos} disabled={loading}>
          <Download size={16} />
          Importar VCF
        </button>
      </div>

      {/* Tabela de Clientes */}
      <div className="clients-table">
        <div className="table-header">
          <div className="table-header-grid">
            <div className="col-nome">Nome</div>
            <div className="col-email">Email</div>
            <div className="col-telefone">Telefone</div>
            <div className="col-empresa">Empresa</div>
            <div className="col-status">Status</div>
            <div className="col-whatsapp">WhatsApp</div>
            <div className="col-contato">Contato</div>
            <div className="col-vale-pena">Vale Pena</div>
            <div className="col-acoes">Ações</div>
          </div>
        </div>
        
        <div className="table-content">
          {loading ? (
            <div className="loading">Carregando...</div>
          ) : clientes.length === 0 ? (
            <div className="loading">Nenhum cliente encontrado</div>
          ) : (
            clientes.map((cliente) => (
              <div key={cliente.id} className="client-row">
                <div className="col-nome">
                  <div className="client-name">{cliente.nome || 'Sem nome'}</div>
                  <div className="client-email-small">{cliente.email}</div>
                </div>
                <div className="col-email">{cliente.email}</div>
                <div className="col-telefone">{cliente.telefone || '-'}</div>
                <div className="col-empresa">
                  {editandoEmpresa === cliente.id ? (
                    <div className="empresa-edit-container">
                      <input
                        type="text"
                        value={empresaTemp}
                        onChange={(e) => setEmpresaTemp(e.target.value)}
                        className="empresa-input"
                        placeholder="Nome da empresa"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            salvarEmpresa(cliente.id);
                          } else if (e.key === 'Escape') {
                            cancelarEdicaoEmpresa();
                          }
                        }}
                        onBlur={() => salvarEmpresa(cliente.id)}
                      />
                    </div>
                  ) : (
                    <div 
                      className="empresa-display"
                      onClick={() => iniciarEdicaoEmpresa(cliente)}
                      title="Clique para editar"
                    >
                      <span className="empresa-text">{cliente.empresa || '-'}</span>
                      <Edit3 size={12} className="empresa-edit-icon" />
                    </div>
                  )}
                </div>
                <div className="col-status">
                  <span className={`status-badge status-${cliente.status}`}>
                    {cliente.status}
                  </span>
                </div>
                <div className="col-whatsapp">
                  <span className={`whatsapp-badge whatsapp-${cliente.tem_whatsapp ? 'sim' : 'nao'}`}>
                    {cliente.tem_whatsapp ? 'Sim' : 'Não'}
                  </span>
                </div>
                <div className="col-contato">
                  <span className={`contato-badge contato-${cliente.fez_contato ? 'sim' : 'nao'}`}>
                    {cliente.fez_contato ? 'Sim' : 'Não'}
                  </span>
                </div>
                <div className="col-vale-pena">
                  <input
                    type="checkbox"
                    checked={Boolean(cliente.vale_pena_contato)}
                    onChange={() => toggleValePena(cliente.id, Boolean(cliente.vale_pena_contato))}
                    className={`vale-pena-checkbox ${atualizandoCheckbox.has(cliente.id) ? 'updating' : ''}`}
                    title="Vale a pena entrar em contato?"
                    disabled={atualizandoCheckbox.has(cliente.id)}
                  />
                </div>
                <div className="col-acoes">
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => abrirModalEdicao(cliente)}
                  >
                    <Edit size={14} />
                  </button>
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => deletarCliente(cliente.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Paginação */}
      {pagination.totalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} clientes
          </div>
          <div className="pagination-controls">
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => setPaginaAtual(paginaAtual - 1)}
              disabled={paginaAtual === 1}
            >
              Anterior
            </button>
            <span className="pagination-page">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => setPaginaAtual(paginaAtual + 1)}
              disabled={paginaAtual === pagination.totalPages}
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {modalAberto && (
        <ClientModal
          cliente={clienteEditando}
          onSave={atualizarCliente}
          onClose={fecharModal}
        />
      )}
    </div>
  );
}

export default App;
