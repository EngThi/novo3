const express = require('express');
const path = require('path');
const fs = require('fs').promises;

/**
 * Servidor do Dashboard de Métricas
 * Interface web para monitoramento em tempo real do pipeline
 */
class DashboardServer {
    constructor(port = 3000) {
        this.app = express();
        this.port = port;
        this.metricsPath = path.join(__dirname, '..', 'logs', 'metrics');
        
        this.setupRoutes();
        this.setupMiddleware();
    }
    
    setupMiddleware() {
        // Parse JSON
        this.app.use(express.json());
        
        // CORS para desenvolvimento
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            next();
        });
    }
    
    setupRoutes() {
        // Página principal
        this.app.get('/', (req, res) => {
            res.send(this.getMainHTML());
        });
        
        // API de métricas
        this.app.get('/api/metrics', async (req, res) => {
            try {
                const days = parseInt(req.query.days) || 7;
                const metrics = await this.getMetrics(days);
                res.json(metrics);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // API de histórico
        this.app.get('/api/history', async (req, res) => {
            try {
                const history = await this.getDailyHistory();
                res.json(history);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
    
    // === HTML DA PÁGINA PRINCIPAL ===
    getMainHTML() {
        return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pipeline Pro - Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        h1 {
            text-align: center;
            margin-bottom: 30px;
            font-size: 2.5rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .metric-card {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px;
            border: 1px solid rgba(255,255,255,0.2);
            transition: transform 0.3s ease;
        }
        
        .metric-card:hover {
            transform: translateY(-5px);
        }
        
        .metric-value {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .metric-label {
            font-size: 0.9rem;
            opacity: 0.8;
        }
        
        .chart-container {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 20px;
            border: 1px solid rgba(255,255,255,0.2);
        }
        
        .status {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 8px;
        }
        
        .status.online { background: #4CAF50; }
        .status.warning { background: #FF9800; }
        .status.error { background: #F44336; }
        
        .refresh-btn {
            background: rgba(255,255,255,0.2);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 10px;
            cursor: pointer;
            transition: background 0.3s;
        }
        
        .refresh-btn:hover {
            background: rgba(255,255,255,0.3);
        }
        
        .loading {
            text-align: center;
            opacity: 0.7;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Pipeline Pro Dashboard</h1>
        
        <div class="metrics-grid" id="metricsGrid">
            <div class="metric-card loading">
                <div class="metric-value">...</div>
                <div class="metric-label">Carregando métricas...</div>
            </div>
        </div>
        
        <div class="chart-container">
            <h3>Histórico de Performance (últimos 7 dias)</h3>
            <div id="historyChart">
                <div class="loading">Carregando gráfico...</div>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
            <button class="refresh-btn" onclick="loadMetrics()">Atualizar Métricas</button>
            <span style="margin-left: 10px; opacity: 0.7;" id="lastUpdate">Carregando...</span>
        </div>
    </div>
    
    <script>
        let metricsData = null;
        
        async function loadMetrics() {
            try {
                // Carregar métricas principais
                const response = await fetch('/api/metrics?days=7');
                metricsData = await response.json();
                
                displayMetrics(metricsData);
                
                // Carregar histórico
                const historyResponse = await fetch('/api/history');
                const historyData = await historyResponse.json();
                
                displayHistory(historyData);
                
                document.getElementById('lastUpdate').textContent = 
                    'Atualizado em: ' + new Date().toLocaleTimeString();
                    
            } catch (error) {
                console.error('Erro ao carregar métricas:', error);
                const grid = document.getElementById('metricsGrid');
                grid.innerHTML = '<div class="metric-card"><div class="metric-value">❌</div><div class="metric-label">Erro ao carregar</div></div>';
            }
        }
        
        function displayMetrics(data) {
            const grid = document.getElementById('metricsGrid');
            
            const successRate = data.total_executions > 0 ? ((data.successful_executions / data.total_executions) * 100).toFixed(1) : 0;
            const avgTime = (data.avg_execution_time / 1000).toFixed(1);
            
            let statusClass = 'online';
            if (successRate < 50) statusClass = 'error';
            else if (successRate < 80) statusClass = 'warning';
            
            grid.innerHTML = 
                '<div class="metric-card">' +
                    '<div class="metric-value">' +
                        '<span class="status ' + statusClass + '"></span>' + data.total_executions +
                    '</div>' +
                    '<div class="metric-label">Total de Execuções</div>' +
                '</div>' +
                
                '<div class="metric-card">' +
                    '<div class="metric-value">' + successRate + '%</div>' +
                    '<div class="metric-label">Taxa de Sucesso</div>' +
                '</div>' +
                
                '<div class="metric-card">' +
                    '<div class="metric-value">' + data.avg_quality.toFixed(1) + '/10</div>' +
                    '<div class="metric-label">Qualidade Média</div>' +
                '</div>' +
                
                '<div class="metric-card">' +
                    '<div class="metric-value">' + avgTime + 's</div>' +
                    '<div class="metric-label">Tempo Médio</div>' +
                '</div>' +
                
                '<div class="metric-card">' +
                    '<div class="metric-value">$' + data.total_cost.toFixed(2) + '</div>' +
                    '<div class="metric-label">Custo Total</div>' +
                '</div>' +
                
                '<div class="metric-card">' +
                    '<div class="metric-value">' + data.quality_distribution.excellent + '</div>' +
                    '<div class="metric-label">Vídeos Excelentes</div>' +
                '</div>';
        }
        
        function displayHistory(data) {
            const container = document.getElementById('historyChart');
            
            if (!data || data.length === 0) {
                container.innerHTML = '<div class="loading">Nenhum dado histórico disponível</div>';
                return;
            }
            
            // Gráfico simples em ASCII/texto
            let chartHTML = '<div style="font-family: monospace; font-size: 12px; line-height: 1.2;">';
            
            data.forEach(function(day, index) {
                const date = new Date(day.date).toLocaleDateString('pt-BR');
                const successRate = day.executions > 0 ? (day.successes / day.executions * 100) : 0;
                const barWidth = Math.max(1, successRate);
                
                chartHTML += 
                    '<div style="margin: 5px 0; display: flex; align-items: center;">' +
                        '<span style="width: 80px; display: inline-block;">' + date + '</span>' +
                        '<div style="width: ' + (barWidth * 2) + 'px; height: 15px; background: linear-gradient(90deg, #4CAF50, #8BC34A); margin-right: 10px;"></div>' +
                        '<span>' + day.executions + ' exec (' + successRate.toFixed(0) + '%)</span>' +
                    '</div>';
            });
            
            chartHTML += '</div>';
            container.innerHTML = chartHTML;
        }
        
        // Carregar métricas ao inicializar
        loadMetrics();
        
        // Auto-refresh a cada 30 segundos
        setInterval(loadMetrics, 30000);
    </script>
</body>
</html>`;
    }
    
    // === COLETA DE MÉTRICAS ===
    async getMetrics(days = 7) {
        const stats = {
            total_executions: 0,
            successful_executions: 0,
            total_cost: 0,
            avg_quality: 0,
            avg_execution_time: 0,
            quality_distribution: {
                excellent: 0,
                good: 0,
                acceptable: 0,
                poor: 0
            }
        };
        
        try {
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
            
            const allMetrics = [];
            
            // Coletar arquivos de métricas
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const metricsFile = path.join(this.metricsPath, `metrics_${dateStr}.json`);
                
                try {
                    const dayMetrics = JSON.parse(await fs.readFile(metricsFile, 'utf8'));
                    allMetrics.push(...dayMetrics);
                } catch {
                    // Arquivo do dia não existe
                }
            }
            
            // Processar métricas
            const qualities = [];
            const executionTimes = [];
            
            for (const metric of allMetrics) {
                stats.total_executions++;
                
                if (metric.success) {
                    stats.successful_executions++;
                    
                    if (metric.quality_score > 0) {
                        qualities.push(metric.quality_score);
                        
                        // Distribuição de qualidade
                        if (metric.quality_score >= 9) stats.quality_distribution.excellent++;
                        else if (metric.quality_score >= 7) stats.quality_distribution.good++;
                        else if (metric.quality_score >= 5) stats.quality_distribution.acceptable++;
                        else stats.quality_distribution.poor++;
                    }
                }
                
                if (metric.execution_time > 0) {
                    executionTimes.push(metric.execution_time);
                }
                
                // Estimar custo
                if (metric.components && metric.components.audio && metric.components.audio.service === 'gemini-tts-premium') {
                    const duration = metric.components.audio.duration || 180;
                    stats.total_cost += (duration / 60) * 0.08;
                }
                stats.total_cost += 0.02; // Custo base por execução
            }
            
            // Calcular médias
            stats.avg_quality = qualities.length > 0 ? 
                qualities.reduce((a, b) => a + b, 0) / qualities.length : 0;
                
            stats.avg_execution_time = executionTimes.length > 0 ? 
                executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length : 0;
            
        } catch (error) {
            console.warn('Erro ao carregar métricas:', error.message);
        }
        
        return stats;
    }
    
    async getDailyHistory() {
        const history = [];
        const days = 7;
        
        try {
            for (let i = days - 1; i >= 0; i--) {
                const date = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));
                const dateStr = date.toISOString().split('T')[0];
                const metricsFile = path.join(this.metricsPath, `metrics_${dateStr}.json`);
                
                let dayStats = {
                    date: dateStr,
                    executions: 0,
                    successes: 0,
                    avg_quality: 0
                };
                
                try {
                    const dayMetrics = JSON.parse(await fs.readFile(metricsFile, 'utf8'));
                    
                    dayStats.executions = dayMetrics.length;
                    dayStats.successes = dayMetrics.filter(m => m.success).length;
                    
                    const qualities = dayMetrics
                        .filter(m => m.success && m.quality_score > 0)
                        .map(m => m.quality_score);
                    
                    dayStats.avg_quality = qualities.length > 0 ?
                        qualities.reduce((a, b) => a + b, 0) / qualities.length : 0;
                        
                } catch {
                    // Arquivo do dia não existe
                }
                
                history.push(dayStats);
            }
        } catch (error) {
            console.warn('Erro ao carregar histórico:', error.message);
        }
        
        return history;
    }
    
    // === INICIALIZAÇÃO ===
    start() {
        this.app.listen(this.port, () => {
            console.log(`\n📊 Dashboard iniciado!`);
            console.log(`🌐 Acesse: http://localhost:${this.port}`);
            console.log(`📈 Métricas em tempo real disponíveis`);
            console.log(`⏰ Auto-refresh a cada 30 segundos\n`);
        });
        
        return this.app;
    }
}

// === EXECUÇÃO DIRETA ===
if (require.main === module) {
    const server = new DashboardServer(3000);
    server.start();
}

module.exports = DashboardServer;