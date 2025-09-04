# Sistema de Gerenciamento de Clientes

Um sistema web completo para gerenciar seus clientes e contatos, com funcionalidades para qualificar clientes, controlar contatos via WhatsApp e acompanhar o status de comunicação.

## 🚀 Funcionalidades

- **Importação de Contatos**: Importa automaticamente contatos do arquivo VCF
- **Qualificação de Clientes**: Marque clientes como ativos ou inativos
- **Controle de WhatsApp**: Identifique quais clientes têm WhatsApp
- **Sistema de Contato**: Acompanhe se já fez contato com cada cliente
- **Busca e Filtros**: Encontre clientes rapidamente com filtros avançados
- **Estatísticas**: Dashboard com métricas importantes
- **Interface Responsiva**: Funciona perfeitamente em desktop e mobile

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express
- **Banco de Dados**: SQLite
- **Estilização**: CSS moderno com design responsivo
- **Ícones**: Lucide React

## 📋 Pré-requisitos

- Node.js (versão 16 ou superior)
- npm ou yarn

## 🚀 Instalação e Execução

### 1. Instalar Dependências

```bash
# Instalar todas as dependências (raiz, servidor e cliente)
npm run install-all
```

### 2. Executar o Sistema

```bash
# Executar em modo desenvolvimento (servidor + cliente)
npm run dev
```

O sistema estará disponível em:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001

### 3. Executar em Produção

```bash
# Construir o frontend
npm run build

# Executar apenas o servidor
npm start
```

## 📱 Como Usar

### 1. Importar Contatos

1. Certifique-se de que o arquivo `Contatos.vcf` está na raiz do projeto
2. Clique no botão **"Importar VCF"** no painel de controle
3. Aguarde a importação ser concluída
4. Os contatos serão automaticamente categorizados

### 2. Gerenciar Clientes

- **Visualizar**: Todos os clientes aparecem na tabela principal
- **Editar**: Clique no ícone de edição para modificar informações
- **Deletar**: Clique no ícone de lixeira para remover um cliente
- **Filtrar**: Use os filtros para encontrar clientes específicos

### 3. Funcionalidades Principais

#### Status do Cliente
- **Ativo**: Cliente em atividade
- **Inativo**: Cliente pausado/desativado

#### WhatsApp
- **Sim**: Cliente possui WhatsApp
- **Não**: Cliente não possui WhatsApp

#### Contato
- **Sim**: Já foi feito contato com o cliente
- **Não**: Ainda não foi feito contato

### 4. Filtros Disponíveis

- **Busca**: Pesquise por nome, email ou telefone
- **Status**: Filtre por ativo/inativo
- **WhatsApp**: Filtre por clientes com/sem WhatsApp
- **Contato**: Filtre por clientes já contatados ou não

### 5. Dashboard de Estatísticas

O painel superior mostra:
- Total de clientes
- Clientes ativos
- Clientes inativos
- Clientes com WhatsApp
- Clientes já contatados

## 🗂️ Estrutura do Projeto

```
sistema-clientes/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── App.jsx         # Componente principal
│   │   └── main.jsx        # Ponto de entrada
│   ├── package.json
│   └── vite.config.js
├── server/                 # Backend Node.js
│   ├── database.js         # Configuração do SQLite
│   ├── vcfParser.js        # Parser para arquivos VCF
│   ├── index.js            # Servidor Express
│   └── package.json
├── Contatos.vcf            # Arquivo de contatos (seu arquivo)
├── package.json            # Scripts principais
└── README.md               # Este arquivo
```

## 🔧 API Endpoints

### Clientes
- `GET /api/clientes` - Listar clientes (com filtros)
- `GET /api/clientes/:id` - Buscar cliente por ID
- `PUT /api/clientes/:id` - Atualizar cliente
- `DELETE /api/clientes/:id` - Deletar cliente

### Importação
- `POST /api/importar-contatos` - Importar contatos do VCF

### Estatísticas
- `GET /api/estatisticas` - Obter estatísticas do sistema

## 🎨 Personalização

### Cores e Tema
As cores principais podem ser alteradas no arquivo `client/src/index.css`:
- Cor primária: `#667eea`
- Cor de sucesso: `#10b981`
- Cor de erro: `#ef4444`

### Campos Adicionais
Para adicionar novos campos aos clientes:
1. Atualize a tabela no `server/database.js`
2. Modifique o formulário em `client/src/components/ClientModal.jsx`
3. Atualize a exibição na tabela em `client/src/App.jsx`

## 🐛 Solução de Problemas

### Erro de Porta em Uso
Se a porta 3000 ou 3001 estiver em uso:
```bash
# Matar processo na porta 3000
lsof -ti:3000 | xargs kill -9

# Matar processo na porta 3001
lsof -ti:3001 | xargs kill -9
```

### Problemas de Importação
- Verifique se o arquivo `Contatos.vcf` está na raiz do projeto
- Certifique-se de que o arquivo não está corrompido
- Verifique os logs do servidor para erros específicos

### Banco de Dados
O banco SQLite é criado automaticamente em `server/clientes.db`. Se precisar resetar:
```bash
rm server/clientes.db
# Reinicie o servidor para recriar o banco
```

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do console do navegador
2. Verifique os logs do servidor no terminal
3. Consulte a documentação das tecnologias utilizadas

## 🔄 Atualizações Futuras

Funcionalidades planejadas:
- Exportação de relatórios
- Integração com APIs de WhatsApp
- Sistema de tags/categorias
- Histórico de contatos
- Backup automático
- Autenticação de usuários

---

**Desenvolvido com ❤️ para gerenciar seus clientes de forma eficiente!**
