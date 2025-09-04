#!/bin/bash

echo "🚀 Iniciando Sistema de Gerenciamento de Clientes..."
echo ""

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale o Node.js primeiro."
    echo "   Acesse: https://nodejs.org/"
    exit 1
fi

# Verificar se npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Por favor, instale o npm primeiro."
    exit 1
fi

echo "✅ Node.js e npm encontrados"
echo ""

# Instalar dependências se necessário
if [ ! -d "node_modules" ] || [ ! -d "server/node_modules" ] || [ ! -d "client/node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm run install-all
    echo ""
fi

# Verificar se o arquivo VCF existe
if [ -f "Contatos.vcf" ]; then
    echo "✅ Arquivo Contatos.vcf encontrado"
else
    echo "⚠️  Arquivo Contatos.vcf não encontrado na raiz do projeto"
    echo "   Certifique-se de que o arquivo está presente para importar os contatos"
fi

echo ""
echo "🌐 Iniciando servidor..."
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo ""
echo "💡 Dicas:"
echo "   - Use o botão 'Importar VCF' para importar seus contatos"
echo "   - Use os filtros para encontrar clientes específicos"
echo "   - Clique no ícone de edição para modificar informações dos clientes"
echo ""
echo "Pressione Ctrl+C para parar o servidor"
echo ""

# Iniciar o sistema
npm run dev
