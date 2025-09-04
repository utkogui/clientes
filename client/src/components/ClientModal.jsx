import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

function ClientModal({ cliente, onSave, onClose }) {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    empresa: '',
    tem_whatsapp: false,
    status: 'ativo',
    fez_contato: false,
    vale_pena_contato: false,
    observacoes: ''
  });

  useEffect(() => {
    if (cliente) {
      setFormData({
        nome: cliente.nome || '',
        email: cliente.email || '',
        telefone: cliente.telefone || '',
        empresa: cliente.empresa || '',
        tem_whatsapp: Boolean(cliente.tem_whatsapp),
        status: cliente.status || 'ativo',
        fez_contato: Boolean(cliente.fez_contato),
        vale_pena_contato: Boolean(cliente.vale_pena_contato),
        observacoes: cliente.observacoes || ''
      });
    }
  }, [cliente]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(cliente.id, formData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Editar Cliente</h2>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nome">Nome *</label>
            <input
              type="text"
              id="nome"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="telefone">Telefone</label>
            <input
              type="tel"
              id="telefone"
              name="telefone"
              value={formData.telefone}
              onChange={handleChange}
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="form-group">
            <label htmlFor="empresa">Empresa</label>
            <input
              type="text"
              id="empresa"
              name="empresa"
              value={formData.empresa}
              onChange={handleChange}
              placeholder="Nome da empresa"
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="tem_whatsapp"
                name="tem_whatsapp"
                checked={formData.tem_whatsapp}
                onChange={handleChange}
              />
              <label htmlFor="tem_whatsapp">Tem WhatsApp</label>
            </div>
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="fez_contato"
                name="fez_contato"
                checked={formData.fez_contato}
                onChange={handleChange}
              />
              <label htmlFor="fez_contato">Já fez contato</label>
            </div>
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="vale_pena_contato"
                name="vale_pena_contato"
                checked={formData.vale_pena_contato}
                onChange={handleChange}
              />
              <label htmlFor="vale_pena_contato">Vale a pena entrar em contato</label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="observacoes">Observações</label>
            <textarea
              id="observacoes"
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              placeholder="Anotações sobre o cliente..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClientModal;
