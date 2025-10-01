const express = require('express');
const http = require('http');
const WebSocket = require('ws');

// Importar sistema ULTIMATE
const GeminiUltimateGenerator = require('../../services/ai/gemini-multi-provider');
const AdvancedVideoAssembler = require('../../services/video/advanced-video-assembler');

class DashboardUltimateIntegrated {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });
        this.port = null;
        
        // Histórico de conteúdo gerado
        this.contentHistory = [];
        
        // Mock dependencies para compatibilidade
        this.logger = {
            info: (msg, data) => console.log(`📊 ${msg}`),
            error: (msg, error) => console.error(`❌ ${msg}`, error?.message || ''),
            warn: (msg, data) => console.warn(`⚠️ ${msg}`, data || '')
        };
        
        this.cache = {
            set: async (key, value) => true,
            get: async (key) => null
        };
        
        // SISTEMA ULTIMATE REAL
        this.ultimateGenerator = new GeminiUltimateGenerator({
            logger: this.logger,
            cache: this.cache
        });
        
        this.videoAssembler = new AdvancedVideoAssembler();
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        
        console.log('🚀 Dashboard Ultimate integrado com Gemini 2.5 Flash + Nano Banana');
    }
    
    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.static(__dirname));
        
        // Servir arquivos estáticos
        this.app.use('/videos', express.static('/home/user/main/novo3/novo/outputs/videos'));
        this.app.use('/thumbnails', express.static('/home/user/main/novo3/novo/outputs/thumbnails'));
        this.app.use('/images', express.static('/home/user/main/novo3/novo/outputs/images'));
        
        // CORS
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
            next();
        });
    }
    
    setupRoutes() {
        // Página principal
        this.app.get('/', (req, res) => {
            res.send(this.getMainHTML());
        });
        
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                service: 'Pipeline Ultimate V5.0 Dashboard',
                timestamp: new Date().toISOString(),
                gemini: 'integrated',
                nanoBanana: 'active'
            });
        });
        
        // Status do sistema Ultimate
        this.app.get('/api/ultimate/status', async (req, res) => {
            try {
                const health = await this.ultimateGenerator.healthCheck();
                res.json(health);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // GERAÇÃO DE VÍDEO COM PIPELINE ULTIMATE COMPLETO
        this.app.post('/api/content/video/ultimate', async (req, res) => {
            const startTime = Date.now();
            
            try {
                const { topic, strategy } = req.body;
                
                console.log(`🚀 PIPELINE ULTIMATE INICIADO: ${topic}`);
                
                // 1. GERAR SCRIPT COM GEMINI 2.5 FLASH + WEB REAL-TIME
                console.log(`🧠 1/4 - Gemini 2.5 Flash: Gerando script com web real-time...`);
                
                const scriptResult = await this.ultimateGenerator.generateScript({
                    topic,
                    style: 'educativo',
                    duration: strategy === 'speed' ? 'short' : strategy === 'quality' ? 'long' : 'medium'
                });
                
                console.log(`✅ Script gerado - Qualidade: ${this.ultimateGenerator.calculateQualityScore(scriptResult.data)}/10`);
                
                // 2. GERAR PROMPTS DE IMAGEM COM GEMINI
                console.log(`🎨 2/4 - Gemini Flash: Gerando prompts visuais consistentes...`);
                
                const promptsResult = await this.ultimateGenerator.generateScript({
                    topic: `Crie 6-8 prompts visuais em INGLÊS para o vídeo "${scriptResult.data.title}". 
                    
Roteiro: ${scriptResult.data.content}

Retorne JSON:
{
  "prompts": [
    {
      "scene": 1,
      "description": "Abertura impactante",
      "prompt": "Professional digital illustration, modern tech style, vibrant colors, AI theme, high quality 8k"
    }
  ]
}`,
                    style: 'tutorial',
                    duration: 'short'
                });
                
                // 3. GERAR IMAGENS COM NANO BANANA (Gemini 2.5 Flash Image)
                console.log(`🍌 3/4 - Nano Banana: Gerando imagens HD consistentes...`);
                
                const imagesResult = await this.ultimateGenerator.generateImageSequence(
                    promptsResult,
                    `ultimate-${Date.now()}`
                );
                
                // 4. MONTAR VÍDEO FINAL OU FALLBACK
                console.log(`🎬 4/4 - Montando vídeo final...`);
                
                let finalVideo;
                
                if (imagesResult.successful > 0) {
                    // Vídeo com imagens reais
                    finalVideo = await this.videoAssembler.assembleVideoFromImages({
                        jobId: `ultimate-${Date.now()}`,
                        images: imagesResult.images,
                        script: scriptResult.data,
                        duration: strategy === 'speed' ? 15 : strategy === 'quality' ? 45 : 30
                    });
                } else {
                    // Fallback para vídeo com efeitos
                    const FinalVideoGenerator = require('../../services/video/final-video-generator');
                    const fallback = new FinalVideoGenerator();
                    
                    finalVideo = await fallback.generateAdvanced({
                        jobId: `ultimate-fallback-${Date.now()}`,
                        title: scriptResult.data.title,
                        duration: strategy === 'speed' ? 15 : strategy === 'quality' ? 45 : 30,
                        strategy: strategy
                    });
                }
                
                const totalTime = Date.now() - startTime;
                
                const completeResult = {
                    success: true,
                    pipeline: 'Ultimate V5.0',
                    script: scriptResult,
                    images: imagesResult,
                    video: finalVideo,
                    metrics: {
                        totalTime: `${Math.round(totalTime / 1000)}s`,
                        scriptQuality: this.ultimateGenerator.calculateQualityScore(scriptResult.data),
                        imagesGenerated: imagesResult.successful,
                        videoQuality: finalVideo.success ? 'HD' : 'Fallback',
                        geminiApiUsed: scriptResult.apiUsed || 1
                    },
                    timestamp: new Date().toISOString()
                };
                
                this.addToHistory('ultimate_video', completeResult);
                
                // Notificação Discord se configurada
                if (process.env.DISCORD_WEBHOOK_URL) {
                    this.sendDiscordNotification('ultimate_video_generated', {
                        topic,
                        quality: completeResult.metrics.scriptQuality,
                        images: imagesResult.successful,
                        duration: totalTime
                    });
                }
                
                res.json(completeResult);
                
            } catch (error) {
                const totalTime = Date.now() - startTime;
                
                console.error('❌ Pipeline Ultimate falhou:', error.message);
                
                res.status(500).json({
                    success: false,
                    pipeline: 'Ultimate V5.0',
                    error: error.message,
                    duration: `${Math.round(totalTime / 1000)}s`,
                    timestamp: new Date().toISOString()
                });
            }
        });
        
        // API de histórico
        this.app.get('/api/history', (req, res) => {
            res.json({
                total: this.contentHistory.length,
                items: this.contentHistory.slice(0, 10) // Últimos 10
            });
        });
        
        // Analytics
        this.app.get('/api/analytics/ultimate', (req, res) => {
            const ultimateJobs = this.contentHistory.filter(item => item.type === 'ultimate_video');
            
            res.json({
                totalUltimateJobs: ultimateJobs.length,
                averageQuality: ultimateJobs.reduce((acc, job) => acc + (job.data.metrics?.scriptQuality || 0), 0) / ultimateJobs.length || 0,
                averageImages: ultimateJobs.reduce((acc, job) => acc + (job.data.metrics?.imagesGenerated || 0), 0) / ultimateJobs.length || 0,
                successRate: (ultimateJobs.filter(job => job.data.success).length / ultimateJobs.length * 100) || 0,
                lastUpdate: new Date().toISOString()
            });
        });
    }
    
    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            console.log(`🔌 WebSocket connected - Pipeline Ultimate (${this.wss.clients.size} clients)`);
            
            ws.send(JSON.stringify({
                type: 'connection',
                message: 'Conectado ao Pipeline Ultimate V5.0 - Gemini 2.5 Flash + Nano Banana ativo!',
                timestamp: new Date().toISOString()
            }));
            
            ws.on('close', () => {
                console.log(`🔌 WebSocket disconnected (${this.wss.clients.size} clients)`);
            });
        });
    }
    
    addToHistory(type, data) {
        const historyItem = {
            id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            type,
            data,
            timestamp: new Date().toISOString(),
            createdAt: new Date()
        };
        
        this.contentHistory.unshift(historyItem);
        
        if (this.contentHistory.length > 100) {
            this.contentHistory = this.contentHistory.slice(0, 100);
        }
        
        this.broadcastUpdate({
            type: 'history_update',
            item: historyItem,
            totalItems: this.contentHistory.length
        });
    }
    
    broadcastUpdate(data) {
        const message = JSON.stringify(data);
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
    
    async sendDiscordNotification(type, data) {
        if (!process.env.DISCORD_WEBHOOK_URL) return;
        
        try {
            const axios = require('axios');
            await axios.post(process.env.DISCORD_WEBHOOK_URL, {
                content: `🚀 **Pipeline Ultimate V5.0**\n\n📹 **Vídeo gerado:** ${data.topic}\n📊 **Qualidade:** ${data.quality}/10\n🎨 **Imagens:** ${data.images}\n⏱️ **Tempo:** ${Math.round(data.duration/1000)}s`
            });
        } catch (error) {
            console.log('📨 Discord notification falhou (opcional)');
        }
    }
    
    getMainHTML() {
        return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pipeline Ultimate V5.0 - Gemini 2.5 Flash + Nano Banana</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; color: #fff; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 2.8rem; margin-bottom: 10px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
        .header .subtitle { font-size: 1.2rem; opacity: 0.9; }
        .pipeline-status { background: rgba(0,255,0,0.2); padding: 15px; border-radius: 15px; margin-bottom: 20px; text-align: center; }
        .card { background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border-radius: 20px; padding: 30px; border: 1px solid rgba(255,255,255,0.2); transition: transform 0.3s ease; margin-bottom: 20px; }
        .card:hover { transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: 600; color: #f0f0f0; }
        .form-control { width: 100%; padding: 12px 15px; border: 2px solid rgba(255,255,255,0.2); border-radius: 10px; background: rgba(255,255,255,0.1); color: #fff; font-size: 1rem; }
        .btn-ultimate { background: linear-gradient(45deg, #ff6b6b, #ffa500, #ff6b6b); color: white; border: none; padding: 18px 35px; border-radius: 25px; cursor: pointer; font-size: 1.1rem; font-weight: 700; width: 100%; text-transform: uppercase; letter-spacing: 1px; transition: all 0.3s ease; }
        .btn-ultimate:hover { transform: translateY(-3px); box-shadow: 0 15px 25px rgba(255,107,107,0.4); }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: rgba(255,255,255,0.15); padding: 25px; border-radius: 15px; text-align: center; backdrop-filter: blur(10px); }
        .metric-value { font-size: 2.2rem; font-weight: bold; color: #4caf50; margin-bottom: 8px; }
        .metric-label { font-size: 0.95rem; opacity: 0.9; }
        .ultimate-badge { position: fixed; top: 20px; right: 20px; background: linear-gradient(45deg, #ff6b6b, #ffa500); padding: 12px 25px; border-radius: 25px; font-weight: 700; font-size: 0.9rem; z-index: 1000; }
    </style>
</head>
<body>
    <div class="ultimate-badge">🚀 PIPELINE ULTIMATE V5.0</div>
    
    <div class="container">
        <div class="header">
            <h1>🚀 Pipeline Ultimate V5.0</h1>
            <div class="subtitle">Gemini 2.5 Flash + Nano Banana + FFmpeg Assembly</div>
        </div>
        
        <div class="pipeline-status">
            <strong>🧠 Gemini 2.5 Flash:</strong> Web Real-time + Script Generation | 
            <strong>🍌 Nano Banana:</strong> HD Image Generation | 
            <strong>🎬 FFmpeg:</strong> Video Assembly
        </div>
        
        <div class="metrics">
            <div class="metric">
                <div class="metric-value" id="ultimateJobs">0</div>
                <div class="metric-label">Vídeos Ultimate</div>
            </div>
            <div class="metric">
                <div class="metric-value" id="avgQuality">0</div>
                <div class="metric-label">Qualidade Média</div>
            </div>
            <div class="metric">
                <div class="metric-value" id="avgImages">0</div>
                <div class="metric-label">Imagens/Vídeo</div>
            </div>
            <div class="metric">
                <div class="metric-value" id="successRate">0%</div>
                <div class="metric-label">Taxa Sucesso</div>
            </div>
        </div>
        
        <div class="card">
            <h3>🚀 Gerador Ultimate V5.0</h3>
            <div style="background: rgba(0,255,0,0.1); padding: 10px; border-radius: 10px; margin-bottom: 20px; font-size: 0.9rem;">
                ✅ Gemini 2.5 Flash | ✅ Nano Banana | ✅ Web Real-time | ✅ Quality Control 8.5+
            </div>
            <div class="form-group">
                <label for="ultimateTopic">Título do Vídeo Ultimate:</label>
                <input type="text" id="ultimateTopic" class="form-control" 
                       placeholder="Ex: Revolução da IA em 2025 com análise de mercado">
            </div>
            <div class="form-group">
                <label for="ultimateStrategy">Estratégia Ultimate:</label>
                <select id="ultimateStrategy" class="form-control">
                    <option value="speed">⚡ Speed Ultimate (15s - 6 imagens)</option>
                    <option value="gcp-free">🆓 GCP Ultimate (30s - 8 imagens)</option>
                    <option value="quality">🏆 Quality Ultimate (45s - 12 imagens)</option>
                </select>
            </div>
            <button class="btn-ultimate" onclick="generateUltimateVideo()" id="ultimateBtn">
                🚀 GERAR VÍDEO ULTIMATE V5.0
            </button>
        </div>
        
        <div class="card">
            <h3>📊 Últimos Vídeos Ultimate</h3>
            <div id="ultimateHistory">
                <p style="opacity: 0.6;">Nenhum vídeo Ultimate gerado ainda...</p>
            </div>
        </div>
    </div>
    
    <script>
        let ws;
        
        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(\`\${protocol}//\${window.location.host}\`);
            ws.onopen = function() { console.log('WebSocket conectado - Pipeline Ultimate V5.0'); };
            ws.onmessage = function(event) {
                const data = JSON.parse(event.data);
                if (data.type === 'history_update') {
                    loadUltimateHistory();
                    loadUltimateAnalytics();
                }
            };
            ws.onclose = function() { setTimeout(connectWebSocket, 3000); };
        }
        
        async function loadUltimateAnalytics() {
            try {
                const response = await fetch('/api/analytics/ultimate');
                const data = await response.json();
                
                document.getElementById('ultimateJobs').textContent = data.totalUltimateJobs || 0;
                document.getElementById('avgQuality').textContent = (data.averageQuality || 0).toFixed(1);
                document.getElementById('avgImages').textContent = Math.round(data.averageImages || 0);
                document.getElementById('successRate').textContent = (data.successRate || 0).toFixed(1) + '%';
            } catch (error) {
                console.error('Erro ao carregar analytics Ultimate:', error);
            }
        }
        
        async function loadUltimateHistory() {
            try {
                const response = await fetch('/api/history');
                const data = await response.json();
                
                const ultimateVideos = data.items.filter(item => item.type === 'ultimate_video').slice(0, 3);
                const historyEl = document.getElementById('ultimateHistory');
                
                if (ultimateVideos.length === 0) {
                    historyEl.innerHTML = '<p style="opacity: 0.6;">Nenhum vídeo Ultimate gerado ainda...</p>';
                    return;
                }
                
                historyEl.innerHTML = ultimateVideos.map(item => {
                    const data = item.data;
                    const metrics = data.metrics || {};
                    
                    return \`
                        <div style="background: rgba(255,255,255,0.1); padding: 20px; margin: 15px 0; border-radius: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <strong>\${data.script?.data?.title || 'Vídeo Ultimate'}</strong>
                                <span style="background: #ff6b6b; padding: 4px 12px; border-radius: 15px; font-size: 0.8rem; font-weight: bold;">
                                    ULTIMATE V5.0
                                </span>
                            </div>
                            <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 10px;">
                                📊 Qualidade: \${metrics.scriptQuality || 0}/10 | 
                                🎨 Imagens: \${metrics.imagesGenerated || 0} | 
                                ⏱️ Tempo: \${metrics.totalTime || '0s'}
                            </div>
                            \${data.video?.videoUrl ? \`
                                <a href="\${data.video.videoUrl}" target="_blank" 
                                   style="color: #4caf50; text-decoration: none; font-weight: 600;">
                                   🎬 Assistir Vídeo Ultimate
                                </a>
                            \` : ''}
                        </div>
                    \`;
                }).join('');
                
            } catch (error) {
                console.error('Erro ao carregar histórico Ultimate:', error);
            }
        }
        
        async function generateUltimateVideo() {
            const topic = document.getElementById('ultimateTopic').value;
            const strategy = document.getElementById('ultimateStrategy').value;
            const btn = document.getElementById('ultimateBtn');
            
            if (!topic) {
                alert('Por favor, insira um título para o vídeo Ultimate.');
                return;
            }
            
            btn.disabled = true;
            btn.innerHTML = '🧠 Gemini 2.5 Flash + Nano Banana Processando...';
            
            try {
                const response = await fetch('/api/content/video/ultimate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic, strategy })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    const metrics = result.metrics;
                    
                    alert(\`🚀 VÍDEO ULTIMATE V5.0 CRIADO!\\n\\n🧠 Gemini Script: \${metrics.scriptQuality}/10\\n🎨 Nano Banana: \${metrics.imagesGenerated} imagens\\n🎬 Vídeo: \${metrics.videoQuality}\\n⏱️ Tempo: \${metrics.totalTime}\\n🔑 API: \${metrics.geminiApiUsed}\\n\\n✅ Pipeline Ultimate completo!\`);
                    
                    document.getElementById('ultimateTopic').value = '';
                } else {
                    alert('❌ Erro Ultimate: ' + result.error);
                }
            } catch (error) {
                alert('❌ Erro Ultimate: ' + error.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = '🚀 GERAR VÍDEO ULTIMATE V5.0';
            }
        }
        
        // Inicialização
        document.addEventListener('DOMContentLoaded', function() {
            connectWebSocket();
            loadUltimateAnalytics();
            loadUltimateHistory();
            
            setInterval(() => {
                loadUltimateAnalytics();
                loadUltimateHistory();
            }, 30000);
        });
    </script>
</body>
</html>
        `;
    }
    
    start() {
        // Criar pastas de outputs
        const fs = require('fs');
        const path = require('path');
        const outputsPath = '/home/user/main/novo3/novo/outputs';
        
        ['videos', 'thumbnails', 'audio', 'images'].forEach(folder => {
            const folderPath = path.join(outputsPath, folder);
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }
        });
        
        this.server.listen(this.port, async () => {
            console.log(`\n🎉 PIPELINE ULTIMATE V5.0 DASHBOARD INTEGRADO!\n`);
            console.log(`🌐 URL: http://localhost:${this.port}`);
            console.log(`🧠 Gemini 2.5 Flash: Script + Web real-time`);
            console.log(`🍌 Nano Banana: Image generation HD`);
            console.log(`🎬 FFmpeg Assembly: Video compilation`);
            console.log(`📊 Quality Control: 8.5+ threshold`);
            console.log(`\n🚀 SISTEMA ULTIMATE TOTALMENTE INTEGRADO!\n`);
        });
    }
}

module.exports = DashboardUltimateIntegrated;
