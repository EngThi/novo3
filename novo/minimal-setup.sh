#!/bin/bash

echo "⚡ CONFIGURAÇÃO MÍNIMA - SÓ O ESSENCIAL"
echo "====================================="

# Manter apenas:
KEEP_FILES=(
    "pipeline-ultimate-robust.js"
    "services/audio/gemini-tts-premium.js"
    ".env"
    "package.json"
)

# Criar backup
cp -r /home/user/main/novo3/novo /home/user/main/novo3/backup-$(date +%Y%m%d)

# Criar diretório limpo
mkdir -p /home/user/main/novo3/novo-minimal
mkdir -p /home/user/main/novo3/novo-minimal/services/audio
mkdir -p /home/user/main/novo3/novo-minimal/outputs/{videos,audio,images}

# Copiar apenas essenciais
for file in "${KEEP_FILES[@]}"; do
    if [ -f "/home/user/main/novo3/novo/$file" ]; then
        cp "/home/user/main/novo3/novo/$file" "/home/user/main/novo3/novo-minimal/$file"
        echo "✅ Copiado: $file"
    fi
done

echo ""
echo "🎊 SETUP MÍNIMO CRIADO EM: /home/user/main/novo3/novo-minimal"
echo "📦 Contém apenas o Pipeline Ultimate Robust + TTS Premium"
echo "💾 Tamanho: $(du -sh /home/user/main/novo3/novo-minimal | cut -f1)"
