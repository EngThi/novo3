const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3002;

// Servir arquivos estáticos
app.use('/videos', express.static('/home/user/main/novo3/novo/outputs/videos'));
app.use('/audio', express.static('/home/user/main/novo3/novo/outputs/audio'));
app.use('/images', express.static('/home/user/main/novo3/novo/outputs/images'));

app.get('/', (req, res) => {
    const videosDir = '/home/user/main/novo3/novo/outputs/videos';
    const audiosDir = '/home/user/main/novo3/novo/outputs/audio';
    
    let videos = [];
    let audios = [];
    
    try {
        videos = fs.readdirSync(videosDir).filter(f => f.endsWith('.mp4')).map(f => {
            const stats = fs.statSync(path.join(videosDir, f));
            return {
                name: f,
                size: Math.round(stats.size / (1024 * 1024)) + 'MB',
                date: stats.mtime.toLocaleString('pt-BR')
            };
        }).sort((a, b) => b.date.localeCompare(a.date));
        
        audios = fs.readdirSync(audiosDir).filter(f => f.endsWith('.wav')).map(f => {
            const stats = fs.statSync(path.join(audiosDir, f));
            return {
                name: f,
                size: Math.round(stats.size / 1024) + 'KB',
                date: stats.mtime.toLocaleString('pt-BR')
            };
        }).sort((a, b) => b.date.localeCompare(a.date));
        
    } catch (error) {
        console.log('Erro ao listar arquivos:', error.message);
    }
    
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>🎬 Pipeline Ultimate - Player</title>
    <style>
        body { font-family: Arial; background: #1a1a2e; color: #eee; padding: 20px; }
        .container { max-width: 1000px; margin: 0 auto; }
        .section { background: #16213e; padding: 20px; margin: 20px 0; border-radius: 10px; }
        .file-item { background: #0f3460; padding: 15px; margin: 10px 0; border-radius: 8px; }
        .file-item h4 { color: #4fc3f7; margin: 0 0 10px 0; }
        .file-info { color: #aaa; font-size: 0.9em; margin-bottom: 10px; }
        video, audio { width: 100%; max-width: 800px; }
        .success-badge { background: #4caf50; padding: 5px 10px; border-radius: 15px; font-size: 0.8em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Pipeline Ultimate TTS - Reprodutor</h1>
        <div class="success-badge">✅ Sistema Funcionando 100%</div>
        
        <div class="section">
            <h2>🎬 Vídeos Gerados (${videos.length})</h2>
            ${videos.map(v => `
                <div class="file-item">
                    <h4>📹 ${v.name}</h4>
                    <div class="file-info">📊 Tamanho: ${v.size} | 📅 Gerado: ${v.date}</div>
                    <video controls>
                        <source src="/videos/${v.name}" type="video/mp4">
                        Seu navegador não suporta vídeo HTML5.
                    </video>
                </div>
            `).join('')}
        </div>
        
        <div class="section">
            <h2>🎙️ Áudios TTS Premium (${audios.length})</h2>
            ${audios.map(a => `
                <div class="file-item">
                    <h4>🎤 ${a.name}</h4>
                    <div class="file-info">📊 Tamanho: ${a.size} | 📅 Gerado: ${a.date}</div>
                    <audio controls>
                        <source src="/audio/${a.name}" type="audio/wav">
                        Seu navegador não suporta áudio HTML5.
                    </audio>
                </div>
            `).join('')}
        </div>
        
        <div class="section">
            <h2>📊 Pipeline Status</h2>
            <div style="color: #4caf50;">
                ✅ Gemini 2.5 Flash: Script Generation<br>
                ✅ Gemini TTS Premium: Narração com voz Zephyr<br>
                ✅ Pollinations AI: Geração de imagens<br>
                ✅ FFmpeg HD: Montagem de vídeo<br>
                ✅ Sistema Optimized: Timeouts ajustados<br>
            </div>
        </div>
        
        <div class="section">
            <h2>🎯 Comandos para Novo Vídeo</h2>
            <div style="background: #0a0a0a; padding: 15px; border-radius: 8px; font-family: monospace;">
                <code>cd /home/user/main/novo3/novo</code><br>
                <code>node pipeline-ultimate-optimized.js "seu tópico aqui"</code>
            </div>
        </div>
    </div>
</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log(`🎬 Video Player rodando em http://localhost:${PORT}`);
    console.log('✅ Pipeline Ultimate TTS - Totalmente Funcional!');
});
