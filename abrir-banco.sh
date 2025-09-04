#!/bin/bash

echo "🗄️  Abrindo Visualizador do Banco de Dados..."
echo ""
echo "📊 Interface Web: http://localhost:3001/database-viewer"
echo "🌐 Sistema Principal: http://localhost:3000"
echo ""
echo "✨ Funcionalidades do Visualizador:"
echo "   • Ver todos os registros do banco"
echo "   • Estatísticas em tempo real"
echo "   • Filtros por telefone e 'vale pena'"
echo "   • Exportar dados para CSV"
echo "   • Paginação para grandes volumes"
echo ""
echo "🚀 Abrindo no navegador..."

# Tentar abrir no navegador padrão
if command -v open &> /dev/null; then
    open "http://localhost:3001/database-viewer"
elif command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:3001/database-viewer"
else
    echo "⚠️  Abra manualmente: http://localhost:3001/database-viewer"
fi
