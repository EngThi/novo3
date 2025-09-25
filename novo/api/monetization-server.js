const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

/**
 * Servidor de API Comercial
 * Sistema completo para monetizar o pipeline de vídeos
 * Suporte a Free/Pro/Enterprise tiers
 */
class MonetizationServer {
    constructor(port = 4000) {
        this.app = express();
        this.port = port;
        this.dbPath = path.join(__dirname, '..', 'data', 'clients.json');
        
        // Pricing tiers
        this.pricingTiers = {
            free: {
                monthly_videos: 10,
                video_quality: '720p',
                api_calls_per_day: 50,
                support: false,
                watermark: true,
                price: 0
            },
            pro: {
                monthly_videos: 100,
                video_quality: '1080p',
                api_calls_per_day: 500,
                support: 'email',
                watermark: false,
                price: 29
            },
            enterprise: {
                monthly_videos: -1, // Unlimited
                video_quality: '4k',
                api_calls_per_day: -1, // Unlimited
                support: 'priority',
                watermark: false,
                custom_branding: true,
                price: 99
            }
        };
        
        this.setupMiddleware();
        this.setupRoutes();
        this.initializeDatabase();
    }
    
    setupMiddleware() {
        // Rate limiting global
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 100, // Limite de requests
            message: { error: 'Too many requests, try again later' }
        });
        
        this.app.use(limiter);
        this.app.use(express.json({ limit: '10mb' }));
        
        // CORS
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
            res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
            next();
        });
        
        // Autenticação middleware
        this.app.use('/api', this.authenticateApiKey.bind(this));
    }
    
    setupRoutes() {
        // Página principal da API
        this.app.get('/', (req, res) => {
            res.json({
                service: 'Pipeline Video API',
                version: '1.0.0',
                status: 'online',
                pricing: this.pricingTiers,
                endpoints: {
                    '/api/generate': 'POST - Generate video',
                    '/api/status/:jobId': 'GET - Check job status',
                    '/api/usage': 'GET - Usage statistics',
                    '/admin': 'GET - Admin dashboard'
                }
            });
        });
        
        // Endpoint principal de geração
        this.app.post('/api/generate', async (req, res) => {
            try {
                const client = req.client;
                const jobId = crypto.randomUUID();
                
                // Verificar limites do cliente
                const canGenerate = await this.checkClientLimits(client);
                if (!canGenerate.allowed) {
                    return res.status(429).json({
                        error: 'Limit exceeded',
                        message: canGenerate.message,
                        upgrade_url: '/pricing'
                    });
                }
                
                // Validar input
                const { template, batch_size = 1, quality, options = {} } = req.body;
                
                if (!template) {
                    return res.status(400).json({ error: 'Template required' });
                }
                
                // Iniciar geração assíncrona
                this.processVideoGeneration({
                    jobId,
                    client,
                    template,
                    batchSize: Math.min(batch_size, client.tier === 'enterprise' ? 10 : 3),
                    quality: this.validateQuality(quality, client.tier),
                    options
                }).catch(error => {
                    console.error(`❌ Erro no job ${jobId}:`, error.message);
                });
                
                // Atualizar usage do cliente
                await this.updateClientUsage(client.id, batch_size);
                
                res.json({
                    job_id: jobId,
                    status: 'processing',
                    estimated_completion: new Date(Date.now() + (batch_size * 120000)).toISOString(), // 2min per video
                    status_url: `/api/status/${jobId}`,
                    client_tier: client.tier
                });
                
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // Status do job
        this.app.get('/api/status/:jobId', async (req, res) => {
            try {
                const status = await this.getJobStatus(req.params.jobId);
                res.json(status);
            } catch (error) {
                res.status(404).json({ error: 'Job not found' });
            }
        });
        
        // Usage statistics
        this.app.get('/api/usage', async (req, res) => {
            try {
                const client = req.client;
                const usage = await this.getClientUsage(client.id);
                res.json(usage);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // Admin dashboard
        this.app.get('/admin', (req, res) => {
            res.send(this.getAdminHTML());
        });
        
        // Pricing info
        this.app.get('/pricing', (req, res) => {
            res.json({
                tiers: this.pricingTiers,
                currency: 'USD',
                billing: 'monthly',
                trial: {
                    duration: '7 days',
                    videos: 5
                }
            });
        });
    }

    // === AUTENTICAÇÃO ===
    async authenticateApiKey(req, res, next) {
        const apiKey = req.headers.authorization?.replace('Bearer ', '');
        
        if (!apiKey) {
            return res.status(401).json({ error: 'API key required' });
        }
        
        try {
            const client = await this.getClientByApiKey(apiKey);
            
            if (!client || !client.active) {
                return res.status(401).json({ error: 'Invalid or inactive API key' });
            }
            
            req.client = client;
            next();
            
        } catch (error) {
            res.status(500).json({ error: 'Authentication error' });
        }
    }

    // === PROCESSAMENTO DE VÍDEOS ===
    async processVideoGeneration(job) {
        console.log(`🎬 Iniciando job ${job.jobId} para cliente ${job.client.id}`);
        
        try {
            // Usar Pipeline Ultimate
            const PipelineUltimate = require('../pipeline-ultimate');
            
            const pipeline = new PipelineUltimate({
                template: job.template,
                batch: job.batchSize,
                withVideo: job.client.tier !== 'free',
                commercial: true
            });
            
            const results = await pipeline.execute();
            
            // Salvar resultado
            await this.saveJobResult(job.jobId, {
                status: 'completed',
                results,
                completed_at: new Date().toISOString(),
                client_id: job.client.id
            });
            
            console.log(`✅ Job ${job.jobId} concluído com sucesso`);
            
        } catch (error) {
            console.error(`❌ Job ${job.jobId} falhou:`, error.message);
            
            await this.saveJobResult(job.jobId, {
                status: 'failed',
                error: error.message,
                completed_at: new Date().toISOString(),
                client_id: job.client.id
            });
        }
    }

    // === DATABASE SIMPLES ===
    async initializeDatabase() {
        try {
            await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
            
            // Verificar se DB existe
            try {
                await fs.access(this.dbPath);
            } catch {
                // Criar DB inicial com cliente de exemplo
                const initialData = {
                    clients: [
                        {
                            id: 'demo-client-1',
                            name: 'Demo User',
                            api_key: 'demo_key_123456789',
                            tier: 'free',
                            active: true,
                            created_at: new Date().toISOString(),
                            usage: {
                                videos_this_month: 0,
                                api_calls_today: 0,
                                last_reset: new Date().toISOString()
                            }
                        }
                    ],
                    jobs: []
                };
                
                await fs.writeFile(this.dbPath, JSON.stringify(initialData, null, 2));
                console.log('📋 Database inicializada com cliente demo');
            }
        } catch (error) {
            console.warn('⚠️ Erro ao inicializar database:', error.message);
        }
    }
    
    async getDatabase() {
        try {
            const data = await fs.readFile(this.dbPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return { clients: [], jobs: [] };
        }
    }
    
    async saveDatabase(data) {
        await fs.writeFile(this.dbPath, JSON.stringify(data, null, 2));
    }

    // === CLIENTE MANAGEMENT ===
    async getClientByApiKey(apiKey) {
        const db = await this.getDatabase();
        return db.clients.find(client => client.api_key === apiKey);
    }
    
    async checkClientLimits(client) {
        const tier = this.pricingTiers[client.tier];
        
        // Verificar limite mensal de vídeos
        if (tier.monthly_videos !== -1 && client.usage.videos_this_month >= tier.monthly_videos) {
            return {
                allowed: false,
                message: `Monthly limit reached (${tier.monthly_videos} videos). Upgrade to continue.`
            };
        }
        
        // Verificar limite diário de API calls
        if (tier.api_calls_per_day !== -1 && client.usage.api_calls_today >= tier.api_calls_per_day) {
            return {
                allowed: false,
                message: `Daily API limit reached (${tier.api_calls_per_day} calls). Try again tomorrow.`
            };
        }
        
        return { allowed: true };
    }
    
    async updateClientUsage(clientId, videoCount) {
        const db = await this.getDatabase();
        const client = db.clients.find(c => c.id === clientId);
        
        if (client) {
            client.usage.videos_this_month += videoCount;
            client.usage.api_calls_today += 1;
            client.usage.last_used = new Date().toISOString();
            
            await this.saveDatabase(db);
        }
    }

    // === JOB MANAGEMENT ===
    async saveJobResult(jobId, result) {
        const db = await this.getDatabase();
        
        const jobIndex = db.jobs.findIndex(job => job.id === jobId);
        
        if (jobIndex !== -1) {
            db.jobs[jobIndex] = { ...db.jobs[jobIndex], ...result };
        } else {
            db.jobs.push({ id: jobId, created_at: new Date().toISOString(), ...result });
        }
        
        // Manter apenas últimos 100 jobs
        if (db.jobs.length > 100) {
            db.jobs = db.jobs.slice(-100);
        }
        
        await this.saveDatabase(db);
    }
    
    async getJobStatus(jobId) {
        const db = await this.getDatabase();
        const job = db.jobs.find(j => j.id === jobId);
        
        if (!job) {
            throw new Error('Job not found');
        }
        
        return {
            job_id: jobId,
            status: job.status || 'processing',
            created_at: job.created_at,
            completed_at: job.completed_at,
            results: job.results,
            error: job.error
        };
    }

    // === ADMIN DASHBOARD ===
    getAdminHTML() {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Pipeline API - Admin Dashboard</title>
    <style>
        body { font-family: Arial; margin: 20px; background: #f5f5f5; }
        .header { background: #333; color: white; padding: 20px; border-radius: 8px; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat-value { font-size: 2rem; font-weight: bold; color: #333; }
        .stat-label { color: #666; font-size: 0.9rem; }
        .section { background: white; margin: 20px 0; padding: 20px; border-radius: 8px; }
        .tier { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; }
        .tier.free { background: #e3f2fd; color: #1976d2; }
        .tier.pro { background: #f3e5f5; color: #7b1fa2; }
        .tier.enterprise { background: #e8f5e8; color: #388e3c; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>💼 Pipeline Video API - Admin Dashboard</h1>
        <p>Sistema de monetização e gerenciamento de clientes</p>
    </div>
    
    <div class="stats">
        <div class="stat-card">
            <div class="stat-value" id="totalClients">-</div>
            <div class="stat-label">Total de Clientes</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" id="activeJobs">-</div>
            <div class="stat-label">Jobs Ativos</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" id="monthlyRevenue">-</div>
            <div class="stat-label">Receita Mensal</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" id="successRate">-</div>
            <div class="stat-label">Taxa de Sucesso</div>
        </div>
    </div>
    
    <div class="section">
        <h3>Clientes Ativos</h3>
        <table id="clientsTable">
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>Tier</th>
                    <th>Vídeos/Mês</th>
                    <th>API Calls/Dia</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    </div>
    
    <div class="section">
        <h3>Jobs Recentes</h3>
        <table id="jobsTable">
            <thead>
                <tr>
                    <th>Job ID</th>
                    <th>Cliente</th>
                    <th>Status</th>
                    <th>Criado</th>
                    <th>Completado</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    </div>
    
    <script>
        async function loadDashboard() {
            try {
                const response = await fetch('/admin/stats');
                const data = await response.json();
                
                // Update stats
                document.getElementById('totalClients').textContent = data.clients.length;
                document.getElementById('activeJobs').textContent = data.active_jobs;
                document.getElementById('monthlyRevenue').textContent = '$' + data.revenue.toFixed(0);
                document.getElementById('successRate').textContent = data.success_rate + '%';
                
                // Update clients table
                const clientsTable = document.getElementById('clientsTable').getElementsByTagName('tbody')[0];
                clientsTable.innerHTML = '';
                
                data.clients.forEach(client => {
                    const row = clientsTable.insertRow();
                    row.innerHTML = 
                        '<td>' + client.name + '</td>' +
                        '<td><span class="tier ' + client.tier + '">' + client.tier.toUpperCase() + '</span></td>' +
                        '<td>' + client.usage.videos_this_month + '</td>' +
                        '<td>' + client.usage.api_calls_today + '</td>' +
                        '<td>' + (client.active ? '🟢 Ativo' : '🔴 Inativo') + '</td>' +
                        '<td><button onclick="viewClient(' + "'" + client.id + "'" + ')">Ver</button></td>';
                });
                
                // Update jobs table
                const jobsTable = document.getElementById('jobsTable').getElementsByTagName('tbody')[0];
                jobsTable.innerHTML = '';
                
                data.recent_jobs.forEach(job => {
                    const row = jobsTable.insertRow();
                    const statusIcon = {
                        'completed': '✅',
                        'processing': '⏳',
                        'failed': '❌'
                    }[job.status] || '❓';
                    
                    row.innerHTML = 
                        '<td>' + job.id.substring(0, 8) + '...</td>' +
                        '<td>' + job.client_id + '</td>' +
                        '<td>' + statusIcon + ' ' + job.status + '</td>' +
                        '<td>' + new Date(job.created_at).toLocaleString() + '</td>' +
                        '<td>' + (job.completed_at ? new Date(job.completed_at).toLocaleString() : '-') + '</td>';
                });
                
            } catch (error) {
                console.error('Erro ao carregar dashboard:', error);
            }
        }
        
        function viewClient(clientId) {
            alert('Ver cliente: ' + clientId + '\n(Funcionalidade em desenvolvimento)');
        }
        
        // Carregar ao inicializar
        loadDashboard();
        
        // Auto-refresh
        setInterval(loadDashboard, 10000);
    </script>
</body>
</html>`;
    }

    // === INICIALIZAÇÃO ===
    start() {
        this.app.listen(this.port, () => {
            console.log(`\n💰 MONETIZATION API STARTED!`);
            console.log(`🌐 API Base: http://localhost:${this.port}`);
            console.log(`📋 Admin: http://localhost:${this.port}/admin`);
            console.log(`📈 Pricing: http://localhost:${this.port}/pricing`);
            console.log(`\n🔑 Demo API Key: demo_key_123456789`);
            console.log(`📝 Example Request:`);
            console.log(`curl -X POST http://localhost:${this.port}/api/generate \\`);
            console.log(`  -H "Authorization: Bearer demo_key_123456789" \\`);
            console.log(`  -H "Content-Type: application/json" \\`);
            console.log(`  -d '{"template":"misterios-brasileiros","batch_size":1}'`);
            console.log('\n' + '='.repeat(60));
        });
        
        return this.app;
    }
}

// === EXECUÇÃO DIRETA ===
if (require.main === module) {
    const server = new MonetizationServer(4000);
    server.start();
}

module.exports = MonetizationServer;