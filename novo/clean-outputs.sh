#!/bin/bash

echo "🗑️ Limpando outputs antigos..."

# Limpar vídeos antigos (manter últimos 3)
cd /home/user/main/novo3/novo/outputs/videos
ls -t *.mp4 2>/dev/null | tail -n +4 | xargs rm -f
echo "✅ Vídeos antigos removidos"

# Limpar áudios antigos (manter últimos 5)
cd /home/user/main/novo3/novo/outputs/audio
ls -t *.wav 2>/dev/null | tail -n +6 | xargs rm -f
echo "✅ Áudios antigos removidos"

# Limpar imagens antigas (manter últimas 10)
cd /home/user/main/novo3/novo/outputs/images
ls -t *.png 2>/dev/null | tail -n +11 | xargs rm -f
echo "✅ Imagens antigas removidas"

# Tamanho final
du -sh /home/user/main/novo3/novo/outputs/
echo "🎊 Limpeza de outputs concluída!"
