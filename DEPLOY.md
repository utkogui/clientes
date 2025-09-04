# 🚀 Deploy no Render

## Configuração do Render

### 1. Tipo de Serviço
- **Escolha**: Web Services
- **Motivo**: Sistema full-stack com backend Node.js e banco de dados

### 2. Configurações no Render

#### **Build & Deploy**
- **Build Command**: `npm run install-all`
- **Start Command**: `npm start`
- **Node Version**: 18.x ou 20.x

#### **Environment Variables**
```
NODE_ENV=production
PORT=10000
```

#### **Health Check**
- **Path**: `/api/estatisticas`

### 3. Estrutura do Projeto
```
/
├── package.json (raiz)
├── render.yaml (configuração)
├── server/
│   ├── package.json
│   ├── index.js
│   ├── database.js
│   ├── vcfParser.js
│   └── clientes.db
└── client/
    ├── package.json
    ├── src/
    └── dist/ (gerado no build)
```

### 4. Scripts Disponíveis
- `npm run install-all`: Instala dependências de todos os projetos
- `npm run build`: Build do frontend React
- `npm start`: Inicia o servidor em produção
- `npm run dev`: Desenvolvimento local

### 5. Funcionalidades
- ✅ Sistema de clientes completo
- ✅ Importação de contatos VCF
- ✅ Filtros e busca
- ✅ Paginação
- ✅ Interface responsiva
- ✅ Banco SQLite local

### 6. Banco de Dados PostgreSQL
- **Banco**: PostgreSQL gratuito do Render
- **Persistência**: Dados mantidos entre deploys
- **Performance**: Melhor que SQLite
- **Escalabilidade**: Suporta crescimento

### 7. Limitações do Plano Gratuito
- **Sleep**: Serviço "dorme" após 15min de inatividade
- **Banco**: 1GB de storage gratuito
- **Storage**: Limitado

### 8. Alternativas para Produção
- **Plano**: Upgrade para plano pago (sem sleep)
- **Banco**: Upgrade para plano pago (mais storage)

## 🎯 Próximos Passos

1. **Fazer commit** de todos os arquivos
2. **Push** para repositório GitHub
3. **Conectar** repositório no Render
4. **Configurar** variáveis de ambiente
5. **Deploy** automático

## 📊 URLs Após Deploy
- **Sistema Principal**: `https://seu-app.onrender.com`
- **API**: `https://seu-app.onrender.com/api/estatisticas`
- **Visualizador DB**: `https://seu-app.onrender.com/database-viewer`
