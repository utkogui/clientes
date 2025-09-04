#!/bin/bash

echo "🐘 Configurando PostgreSQL para o Sistema de Clientes..."

# Verificar se PostgreSQL está instalado
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL não encontrado. Instalando..."
    
    # macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install postgresql@15
            brew services start postgresql@15
        else
            echo "❌ Homebrew não encontrado. Instale manualmente o PostgreSQL."
            exit 1
        fi
    # Ubuntu/Debian
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt update
        sudo apt install postgresql postgresql-contrib
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    else
        echo "❌ Sistema operacional não suportado. Instale PostgreSQL manualmente."
        exit 1
    fi
else
    echo "✅ PostgreSQL já está instalado"
fi

# Criar banco de dados
echo "🗄️  Criando banco de dados 'clientes'..."
sudo -u postgres createdb clientes 2>/dev/null || echo "⚠️  Banco 'clientes' já existe ou erro na criação"

# Criar usuário (opcional)
echo "👤 Configurando usuário..."
sudo -u postgres psql -c "CREATE USER clientes_user WITH PASSWORD 'clientes123';" 2>/dev/null || echo "⚠️  Usuário já existe"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE clientes TO clientes_user;" 2>/dev/null || echo "⚠️  Permissões já configuradas"

echo "✅ PostgreSQL configurado com sucesso!"
echo ""
echo "🔧 Configurações:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: clientes"
echo "   User: clientes_user"
echo "   Password: clientes123"
echo ""
echo "📝 String de conexão:"
echo "   postgresql://clientes_user:clientes123@localhost:5432/clientes"
echo ""
echo "🚀 Para migrar os dados:"
echo "   cd server && npm run migrate"
