/**
 * AI Content Studio - Web Dashboard Server
 * Modern Express server with WebSocket, real-time updates
 * Features: Content Creator, Analytics, Video Gallery, Settings
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs').promises;

class DashboardServer {
    constructor(dependencies = {}) {
        this.config = dependencies.config;
        this.logger = dependencies.logger || console;
        this.cache = dependencies.cache;
        
        // Initialize services
        this.scriptGenerator = dependencies.scriptGenerator;
        this.thumbnailGenerator = dependencies.thumbnailGenerator;
        this.pipelineCore = dependencies.pipelineCore;
        
        // Express app setup
        this.app = express();
        this.server = http.createServer(this.app);
        
        // WebSocket setup for real-time updates
        this.wss = new WebSocket.Server({ server: this.server });
        this.clients = new Set();
        
        // Active jobs tracking
        this.activeJobs = new Map();
        this.jobHistory = [];
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
    }
    
    setupMiddleware() {
        // JSON parsing
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ extended: true }));
        
        // CORS
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
            } else {
                next();
            }
        });
        
        // Static files
        this.app.use('/static', express.static(path.join(__dirname, 'public')));
        
        // Request logging
        this.app.use((req, res, next) => {
            if (this.logger.info) {
                this.logger.info(`${req.method} ${req.path}`, {
                    userAgent: req.get('User-Agent'),
                    ip: req.ip
                });
            }
            next();
        });
    }
    
    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                service: 'AI Content Studio Dashboard',
                version: '2.0.0',
                uptime: process.uptime(),
                timestamp: new Date().toISOString()
            });
        });
        
        // Main dashboard page
        this.app.get('/', (req, res) => {
            res.send(this.generateDashboardHTML());
        });
        
        // API Routes
        this.setupAPIRoutes();
    }
    
    setupAPIRoutes() {
        const apiRouter = express.Router();
        
        // Content Creation API
        apiRouter.post('/content/script', async (req, res) => {
            try {
                const { topic, style, duration, targetAudience } = req.body;
                
                if (!topic) {
                    return res.status(400).json({ error: 'Topic is required' });
                }
                
                const jobId = this.generateJobId();
                
                // Track job
                this.activeJobs.set(jobId, {
                    type: 'script_generation',
                    status: 'processing',
                    startTime: Date.now(),
                    params: { topic, style, duration, targetAudience }
                });
                
                // Broadcast job start
                this.broadcastUpdate({
                    type: 'job_started',
                    jobId,
                    jobType: 'script_generation',
                    params: { topic, style }
                });
                
                // Generate script
                const result = await this.scriptGenerator.generateScript({
                    topic,
                    style: style || 'educativo',
                    duration: duration || 'medium',
                    targetAudience: targetAudience || 'geral'
                });
                
                // Update job status
                const job = this.activeJobs.get(jobId);
                job.status = 'completed';
                job.duration = Date.now() - job.startTime;
                job.result = result;
                
                // Move to history
                this.jobHistory.unshift(job);
                this.activeJobs.delete(jobId);
                
                // Broadcast completion
                this.broadcastUpdate({
                    type: 'job_completed',
                    jobId,
                    duration: job.duration,
                    result: {
                        title: result.script.title,
                        quality: result.quality.score,
                        seoScore: result.seo.tags.length
                    }
                });
                
                res.json({
                    success: true,
                    jobId,
                    script: result
                });
                
            } catch (error) {
                this.logger.error && this.logger.error('Script generation failed', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
        
        // Thumbnail Generation API
        apiRouter.post('/content/thumbnail', async (req, res) => {
            try {
                const { script, topic, style, targetAudience, abTest } = req.body;
                
                if (!script && !topic) {
                    return res.status(400).json({ error: 'Script or topic is required' });
                }
                
                const jobId = this.generateJobId();
                
                this.activeJobs.set(jobId, {
                    type: 'thumbnail_generation',
                    status: 'processing',
                    startTime: Date.now(),
                    params: { topic, style, abTest }
                });
                
                this.broadcastUpdate({
                    type: 'job_started',
                    jobId,
                    jobType: 'thumbnail_generation',
                    params: { topic, style }
                });
                
                const result = await this.thumbnailGenerator.generateThumbnail({
                    script,
                    topic,
                    style: style || 'auto',
                    targetAudience: targetAudience || 'geral',
                    abTest: abTest !== false
                });
                
                const job = this.activeJobs.get(jobId);
                job.status = 'completed';
                job.duration = Date.now() - job.startTime;
                job.result = result;
                
                this.jobHistory.unshift(job);
                this.activeJobs.delete(jobId);
                
                this.broadcastUpdate({
                    type: 'job_completed',
                    jobId,
                    duration: job.duration,
                    result: {
                        template: result.template.name,
                        ctr: result.recommended.ctrPrediction,
                        variations: result.thumbnails.length
                    }
                });
                
                res.json({
                    success: true,
                    jobId,
                    thumbnail: result
                });
                
            } catch (error) {
                this.logger.error && this.logger.error('Thumbnail generation failed', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
        
        // Complete Video Generation API
        apiRouter.post('/content/video', async (req, res) => {
            try {
                const { prompt, strategy, style, duration } = req.body;
                
                if (!prompt) {
                    return res.status(400).json({ error: 'Prompt is required' });
                }
                
                const jobId = this.generateJobId();
                
                this.activeJobs.set(jobId, {
                    type: 'video_generation',
                    status: 'processing',
                    startTime: Date.now(),
                    params: { prompt, strategy, style }
                });
                
                this.broadcastUpdate({
                    type: 'job_started',
                    jobId,
                    jobType: 'video_generation',
                    params: { prompt, strategy }
                });
                
                // Generate complete video content
                const [script, thumbnail] = await Promise.all([
                    this.scriptGenerator.generateScript({
                        topic: prompt,
                        style: style || 'educativo',
                        duration: duration || 'medium'
                    }),
                    this.thumbnailGenerator.generateThumbnail({
                        script: { content: prompt },
                        topic: prompt,
                        style: 'auto'
                    })
                ]);
                
                // Execute pipeline
                const pipeline = await this.pipelineCore.execute({
                    prompt,
                    strategy: strategy || 'gcp-free'
                });
                
                const job = this.activeJobs.get(jobId);
                job.status = 'completed';
                job.duration = Date.now() - job.startTime;
                job.result = { script, thumbnail, pipeline };
                
                this.jobHistory.unshift(job);
                this.activeJobs.delete(jobId);
                
                this.broadcastUpdate({
                    type: 'job_completed',
                    jobId,
                    duration: job.duration,
                    result: {
                        videoUrl: pipeline.result.videoUrl,
                        quality: script.quality.score,
                        ctr: thumbnail.recommended.ctrPrediction
                    }
                });
                
                res.json({
                    success: true,
                    jobId,
                    video: {
                        script,
                        thumbnail,
                        pipeline
                    }
                });
                
            } catch (error) {
                this.logger.error && this.logger.error('Video generation failed', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
        
        // Analytics API
        apiRouter.get('/analytics/overview', (req, res) => {
            const stats = this.getAnalyticsOverview();
            res.json(stats);
        });
        
        apiRouter.get('/analytics/jobs', (req, res) => {
            const limit = parseInt(req.query.limit) || 20;
            const jobs = this.jobHistory.slice(0, limit).map(job => ({
                id: job.id,
                type: job.type,
                status: job.status,
                duration: job.duration,
                startTime: job.startTime,
                params: job.params
            }));
            
            res.json({ jobs });
        });
        
        // System Status API
        apiRouter.get('/system/status', async (req, res) => {
            try {
                const status = {
                    server: {
                        status: 'healthy',
                        uptime: process.uptime(),
                        memory: process.memoryUsage(),
                        activeConnections: this.clients.size
                    },
                    services: {},
                    activeJobs: this.activeJobs.size,
                    totalJobsProcessed: this.jobHistory.length
                };
                
                // Check service health
                if (this.scriptGenerator?.healthCheck) {
                    status.services.scriptGenerator = await this.scriptGenerator.healthCheck();
                }
                
                if (this.thumbnailGenerator?.healthCheck) {
                    status.services.thumbnailGenerator = await this.thumbnailGenerator.healthCheck();
                }
                
                if (this.pipelineCore?.healthCheck) {
                    status.services.pipelineCore = await this.pipelineCore.healthCheck();
                }
                
                res.json(status);
                
            } catch (error) {
                res.status(500).json({
                    error: 'Failed to get system status',
                    message: error.message
                });
            }
        });
        
        // Mount API routes
        this.app.use('/api', apiRouter);
    }
    
    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            this.clients.add(ws);
            
            if (this.logger.info) {
                this.logger.info('WebSocket client connected', {
                    clientCount: this.clients.size,
                    userAgent: req.headers['user-agent']
                });
            }
            
            // Send initial status
            ws.send(JSON.stringify({
                type: 'connection_established',
                clientId: this.generateClientId(),
                serverStatus: 'online',
                activeJobs: this.activeJobs.size
            }));
            
            ws.on('close', () => {
                this.clients.delete(ws);
                if (this.logger.info) {
                    this.logger.info('WebSocket client disconnected', {
                        clientCount: this.clients.size
                    });
                }
            });
            
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleWebSocketMessage(ws, message);
                } catch (error) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Invalid message format'
                    }));
                }
            });
        });
    }
    
    handleWebSocketMessage(ws, message) {
        switch (message.type) {
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                break;
                
            case 'subscribe_updates':
                ws.subscribeToUpdates = true;
                break;
                
            case 'get_status':
                ws.send(JSON.stringify({
                    type: 'status_update',
                    activeJobs: this.activeJobs.size,
                    totalProcessed: this.jobHistory.length,
                    uptime: process.uptime()
                }));
                break;
        }
    }
    
    broadcastUpdate(update) {
        const message = JSON.stringify({
            ...update,
            timestamp: Date.now()
        });
        
        this.clients.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN && ws.subscribeToUpdates) {
                ws.send(message);
            }
        });
    }
    
    getAnalyticsOverview() {
        const completedJobs = this.jobHistory.filter(job => job.status === 'completed');
        const avgDuration = completedJobs.length > 0 ? 
            completedJobs.reduce((sum, job) => sum + job.duration, 0) / completedJobs.length : 0;
        
        const jobsByType = {};
        this.jobHistory.forEach(job => {
            jobsByType[job.type] = (jobsByType[job.type] || 0) + 1;
        });
        
        const last24Hours = this.jobHistory.filter(job => 
            Date.now() - job.startTime < 24 * 60 * 60 * 1000
        );
        
        return {
            overview: {
                totalJobs: this.jobHistory.length,
                completedJobs: completedJobs.length,
                activeJobs: this.activeJobs.size,
                successRate: completedJobs.length / Math.max(this.jobHistory.length, 1) * 100,
                avgProcessingTime: Math.round(avgDuration)
            },
            jobsByType,
            recentActivity: {
                last24Hours: last24Hours.length,
                avgDurationToday: last24Hours.length > 0 ? 
                    last24Hours.reduce((sum, job) => sum + (job.duration || 0), 0) / last24Hours.length : 0
            },
            performance: {
                scriptGeneration: {
                    count: jobsByType.script_generation || 0,
                    avgQuality: 85 // Mock value
                },
                thumbnailGeneration: {
                    count: jobsByType.thumbnail_generation || 0,
                    avgCTR: 8.5 // Mock value
                },
                videoGeneration: {
                    count: jobsByType.video_generation || 0,
                    avgDuration: Math.round(avgDuration / 1000) // Convert to seconds
                }
            }
        };
    }
    
    generateDashboardHTML() {
        return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Content Studio - Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        
        .dashboard {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 2.5em;
            background: linear-gradient(45deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }
        
        .status-bar {
            display: flex;
            gap: 20px;
            margin-top: 20px;
        }
        
        .status-item {
            background: rgba(255,255,255,0.7);
            padding: 15px 20px;
            border-radius: 10px;
            text-align: center;
            min-width: 120px;
        }
        
        .status-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #667eea;
        }
        
        .cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 30px;
            margin-bottom: 30px;
        }
        
        .card {
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        
        .card h2 {
            color: #667eea;
            margin-bottom: 20px;
            font-size: 1.4em;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #555;
        }
        
        .form-control {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e1e5e9;
            border-radius: 10px;
            font-size: 16px;
            transition: all 0.3s ease;
        }
        
        .form-control:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
            outline: none;
        }
        
        .btn {
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 14px 28px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            width: 100%;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(102,126,234,0.4);
        }
        
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .progress {
            background: #e1e5e9;
            border-radius: 10px;
            height: 8px;
            margin: 10px 0;
            overflow: hidden;
        }
        
        .progress-bar {
            background: linear-gradient(45deg, #667eea, #764ba2);
            height: 100%;
            width: 0%;
            transition: width 0.3s ease;
        }
        
        .job-item {
            background: rgba(102,126,234,0.1);
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 10px;
            border-left: 4px solid #667eea;
        }
        
        .job-status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-processing {
            background: #fef3cd;
            color: #856404;
        }
        
        .status-completed {
            background: #d4edda;
            color: #155724;
        }
        
        .status-failed {
            background: #f8d7da;
            color: #721c24;
        }
        
        .connection-status {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            border-radius: 20px;
            font-weight: bold;
            z-index: 1000;
        }
        
        .connected {
            background: #d4edda;
            color: #155724;
        }
        
        .disconnected {
            background: #f8d7da;
            color: #721c24;
        }
        
        @media (max-width: 768px) {
            .cards {
                grid-template-columns: 1fr;
            }
            
            .status-bar {
                flex-wrap: wrap;
            }
            
            .dashboard {
                padding: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="connection-status" id="connectionStatus">🔌 Conectando...</div>
        
        <div class="header">
            <h1>🚀 AI Content Studio</h1>
            <p>Dashboard Enterprise - Crie vídeos profissionais com Inteligência Artificial</p>
            
            <div class="status-bar">
                <div class="status-item">
                    <div class="status-value" id="activeJobs">-</div>
                    <div>Jobs Ativos</div>
                </div>
                <div class="status-item">
                    <div class="status-value" id="totalJobs">-</div>
                    <div>Total Processados</div>
                </div>
                <div class="status-item">
                    <div class="status-value" id="successRate">-</div>
                    <div>Taxa Sucesso</div>
                </div>
                <div class="status-item">
                    <div class="status-value" id="avgTime">-</div>
                    <div>Tempo Médio</div>
                </div>
            </div>
        </div>
        
        <div class="cards">
            <!-- Script Generator Card -->
            <div class="card">
                <h2>📝 Gerador de Roteiros</h2>
                <form id="scriptForm">
                    <div class="form-group">
                        <label>Tópico do Vídeo</label>
                        <input type="text" class="form-control" id="scriptTopic" 
                               placeholder="Ex: Inteligência Artificial 2024" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Estilo</label>
                        <select class="form-control" id="scriptStyle">
                            <option value="educativo">📚 Educativo</option>
                            <option value="entretenimento">🎭 Entretenimento</option>
                            <option value="news">📰 Notícias</option>
                            <option value="tutorial">🎯 Tutorial</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Duração</label>
                        <select class="form-control" id="scriptDuration">
                            <option value="short">⚡ Curto (3-5 min)</option>
                            <option value="medium" selected>⏱️ Médio (8-12 min)</option>
                            <option value="long">📖 Longo (15-20 min)</option>
                        </select>
                    </div>
                    
                    <button type="submit" class="btn" id="generateScript">
                        🚀 Gerar Roteiro
                    </button>
                    
                    <div class="progress" id="scriptProgress" style="display: none;">
                        <div class="progress-bar"></div>
                    </div>
                </form>
            </div>
            
            <!-- Thumbnail Generator Card -->
            <div class="card">
                <h2>🎨 Gerador de Thumbnails</h2>
                <form id="thumbnailForm">
                    <div class="form-group">
                        <label>Tópico</label>
                        <input type="text" class="form-control" id="thumbTopic" 
                               placeholder="Ex: IA Revolucionária" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Estilo Visual</label>
                        <select class="form-control" id="thumbStyle">
                            <option value="auto">🤖 Automático</option>
                            <option value="tech_modern">💻 Tech Moderno</option>
                            <option value="viral_impact">🔥 Viral Impact</option>
                            <option value="professional_clean">👔 Profissional</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="enableAB" checked> 
                            A/B Testing (3 variações)
                        </label>
                    </div>
                    
                    <button type="submit" class="btn" id="generateThumbnail">
                        🎨 Gerar Thumbnail
                    </button>
                    
                    <div class="progress" id="thumbProgress" style="display: none;">
                        <div class="progress-bar"></div>
                    </div>
                </form>
            </div>
            
            <!-- Video Generator Card -->
            <div class="card">
                <h2>🎬 Gerador de Vídeo Completo</h2>
                <form id="videoForm">
                    <div class="form-group">
                        <label>Prompt/Ideia</label>
                        <textarea class="form-control" id="videoPrompt" rows="3" 
                                  placeholder="Descreva a ideia do seu vídeo..." required></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>Estratégia</label>
                        <select class="form-control" id="videoStrategy">
                            <option value="gcp-free">💚 GCP-Free (Rápido)</option>
                            <option value="premium">💎 Premium (Alta Qualidade)</option>
                            <option value="speed">⚡ Speed (Super Rápido)</option>
                            <option value="quality">🏆 Quality (Máxima Qualidade)</option>
                        </select>
                    </div>
                    
                    <button type="submit" class="btn" id="generateVideo">
                        🎬 Criar Vídeo Completo
                    </button>
                    
                    <div class="progress" id="videoProgress" style="display: none;">
                        <div class="progress-bar"></div>
                    </div>
                </form>
            </div>
            
            <!-- Jobs Monitor Card -->
            <div class="card">
                <h2>📊 Monitor de Jobs</h2>
                <div id="jobsList">
                    <p>Nenhum job ativo no momento...</p>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // WebSocket connection
        let ws = null;
        let reconnectInterval = null;
        
        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = \`\${protocol}//\${window.location.host}\`;
            
            ws = new WebSocket(wsUrl);
            
            ws.onopen = function() {
                console.log('🔌 WebSocket conectado');
                updateConnectionStatus(true);
                
                // Subscribe to updates
                ws.send(JSON.stringify({ type: 'subscribe_updates' }));
                
                // Clear reconnect interval
                if (reconnectInterval) {
                    clearInterval(reconnectInterval);
                    reconnectInterval = null;
                }
            };
            
            ws.onmessage = function(event) {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            };
            
            ws.onclose = function() {
                console.log('❌ WebSocket desconectado');
                updateConnectionStatus(false);
                
                // Auto reconnect
                if (!reconnectInterval) {
                    reconnectInterval = setInterval(() => {
                        console.log('🔄 Tentando reconectar...');
                        connectWebSocket();
                    }, 3000);
                }
            };
        }
        
        function updateConnectionStatus(connected) {
            const status = document.getElementById('connectionStatus');
            if (connected) {
                status.textContent = '🟢 Conectado';
                status.className = 'connection-status connected';
            } else {
                status.textContent = '🔴 Desconectado';
                status.className = 'connection-status disconnected';
            }
        }
        
        function handleWebSocketMessage(data) {
            console.log('📨 Mensagem recebida:', data);
            
            switch (data.type) {
                case 'job_started':
                    addJobToMonitor(data);
                    break;
                    
                case 'job_completed':
                    updateJobInMonitor(data);
                    loadAnalytics(); // Refresh analytics
                    break;
                    
                case 'status_update':
                    updateDashboardStats(data);
                    break;
            }
        }
        
        function addJobToMonitor(data) {
            const jobsList = document.getElementById('jobsList');
            const jobElement = document.createElement('div');
            jobElement.className = 'job-item';
            jobElement.id = \`job-\${data.jobId}\`;
            
            jobElement.innerHTML = \`
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>\${getJobTypeLabel(data.jobType)}</strong><br>
                        <small>\${data.params?.topic || data.params?.prompt || 'Sem título'}</small>
                    </div>
                    <span class="job-status status-processing">Processando</span>
                </div>
            \`;
            
            if (jobsList.firstChild?.textContent.includes('Nenhum job')) {
                jobsList.innerHTML = '';
            }
            
            jobsList.insertBefore(jobElement, jobsList.firstChild);
        }
        
        function updateJobInMonitor(data) {
            const jobElement = document.getElementById(\`job-\${data.jobId}\`);
            if (jobElement) {
                const statusElement = jobElement.querySelector('.job-status');
                statusElement.textContent = 'Concluído';
                statusElement.className = 'job-status status-completed';
                
                // Add duration info
                const duration = Math.round(data.duration / 1000);
                const durationElement = document.createElement('small');
                durationElement.textContent = \` (\${duration}s)\`;
                statusElement.appendChild(durationElement);
            }
        }
        
        function getJobTypeLabel(type) {
            const labels = {
                'script_generation': '📝 Roteiro',
                'thumbnail_generation': '🎨 Thumbnail',
                'video_generation': '🎬 Vídeo'
            };
            return labels[type] || type;
        }
        
        // Form handlers
        document.getElementById('scriptForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const topic = document.getElementById('scriptTopic').value;
            const style = document.getElementById('scriptStyle').value;
            const duration = document.getElementById('scriptDuration').value;
            
            const button = document.getElementById('generateScript');
            const progress = document.getElementById('scriptProgress');
            
            button.disabled = true;
            button.textContent = '⏳ Gerando...';
            progress.style.display = 'block';
            
            try {
                const response = await fetch('/api/content/script', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic, style, duration })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert(\`✅ Roteiro gerado!\\n\\nTítulo: \${result.script.script.title}\\nQualidade: \${result.script.quality.score}/100\`);
                } else {
                    alert(\`❌ Erro: \${result.error}\`);
                }
            } catch (error) {
                alert(\`❌ Erro de conexão: \${error.message}\`);
            } finally {
                button.disabled = false;
                button.textContent = '🚀 Gerar Roteiro';
                progress.style.display = 'none';
            }
        });
        
        document.getElementById('thumbnailForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const topic = document.getElementById('thumbTopic').value;
            const style = document.getElementById('thumbStyle').value;
            const abTest = document.getElementById('enableAB').checked;
            
            const button = document.getElementById('generateThumbnail');
            const progress = document.getElementById('thumbProgress');
            
            button.disabled = true;
            button.textContent = '⏳ Gerando...';
            progress.style.display = 'block';
            
            try {
                const response = await fetch('/api/content/thumbnail', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic, style, abTest })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    const thumb = result.thumbnail.recommended;
                    alert(\`✅ Thumbnail gerado!\\n\\nTemplate: \${result.thumbnail.template.name}\\nCTR Previsto: \${thumb.ctrPrediction.toFixed(1)}%\\nVariações: \${result.thumbnail.thumbnails.length}\`);
                } else {
                    alert(\`❌ Erro: \${result.error}\`);
                }
            } catch (error) {
                alert(\`❌ Erro de conexão: \${error.message}\`);
            } finally {
                button.disabled = false;
                button.textContent = '🎨 Gerar Thumbnail';
                progress.style.display = 'none';
            }
        });
        
        document.getElementById('videoForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const prompt = document.getElementById('videoPrompt').value;
            const strategy = document.getElementById('videoStrategy').value;
            
            const button = document.getElementById('generateVideo');
            const progress = document.getElementById('videoProgress');
            
            button.disabled = true;
            button.textContent = '⏳ Criando Vídeo...';
            progress.style.display = 'block';
            
            try {
                const response = await fetch('/api/content/video', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt, strategy })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    const video = result.video;
                    alert(\`✅ Vídeo criado!\\n\\nURL: \${video.pipeline.result.videoUrl}\\nQualidade: \${video.script.quality.score}/100\\nCTR: \${video.thumbnail.recommended.ctrPrediction.toFixed(1)}%\`);
                } else {
                    alert(\`❌ Erro: \${result.error}\`);
                }
            } catch (error) {
                alert(\`❌ Erro de conexão: \${error.message}\`);
            } finally {
                button.disabled = false;
                button.textContent = '🎬 Criar Vídeo Completo';
                progress.style.display = 'none';
            }
        });
        
        // Load analytics
        async function loadAnalytics() {
            try {
                const response = await fetch('/api/analytics/overview');
                const data = await response.json();
                
                document.getElementById('activeJobs').textContent = data.overview.activeJobs;
                document.getElementById('totalJobs').textContent = data.overview.totalJobs;
                document.getElementById('successRate').textContent = \`\${data.overview.successRate.toFixed(1)}%\`;
                document.getElementById('avgTime').textContent = \`\${Math.round(data.overview.avgProcessingTime/1000)}s\`;
                
            } catch (error) {
                console.error('Erro ao carregar analytics:', error);
            }
        }
        
        // Initialize
        connectWebSocket();
        loadAnalytics();
        
        // Refresh analytics every 30 seconds
        setInterval(loadAnalytics, 30000);
    </script>
</body>
</html>
        `;
    }
    
    // Utility methods
    generateJobId() {
        return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }
    
    start(port = 3001) {
        return new Promise((resolve) => {
            this.server.listen(port, () => {
                if (this.logger.info) {
                    this.logger.info(`🌐 AI Content Studio Dashboard started on port ${port}`, {
                        url: `http://localhost:${port}`,
                        features: ['WebSocket', 'Real-time Updates', 'REST API']
                    });
                }
                resolve(port);
            });
        });
    }
    
    stop() {
        return new Promise((resolve) => {
            this.server.close(() => {
                this.wss.close();
                if (this.logger.info) {
                    this.logger.info('🛑 Dashboard server stopped');
                }
                resolve();
            });
        });
    }
}

module.exports = { DashboardServer };

// Auto-start if called directly
if (require.main === module) {
    const server = new DashboardServer();
    server.start().catch(console.error);
}