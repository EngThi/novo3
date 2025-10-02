#!/bin/bash

echo "📦 Limpando node_modules..."

cd /home/user/main/novo3/novo

# Tamanho antes
SIZE_BEFORE=$(du -sb node_modules 2>/dev/null | cut -f1)

# Remover cache
rm -rf node_modules/.cache
rm -rf node_modules/.npm
rm -rf node_modules/**/.nyc_output

# Reinstalar só essenciais
npm install --production --no-optional

# Tamanho depois
SIZE_AFTER=$(du -sb node_modules 2>/dev/null | cut -f1)

if [ ! -z "$SIZE_BEFORE" ] && [ ! -z "$SIZE_AFTER" ]; then
    SAVED=$((SIZE_BEFORE - SIZE_AFTER))
    echo "💾 Economizado: $(($SAVED / 1024 / 1024))MB"
fi

echo "✅ Node modules otimizado!"
