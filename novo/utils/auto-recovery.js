/**
 * Sistema de Auto Recovery
 * Gerencia falhas automaticamente com retry inteligente e fallbacks
 */
class AutoRecovery {
    constructor(options = {}) {
        this.maxRetries = options.maxRetries || 3;
        this.baseDelay = options.baseDelay || 1000; // 1 segundo
        this.maxDelay = options.maxDelay || 30000; // 30 segundos
        this.backoffMultiplier = options.backoffMultiplier || 2;
        
        this.stats = {
            total_executions: 0,
            total_failures: 0,
            recoveries: 0,
            permanent_failures: 0
        };
    }
    
    // === EXECUÇÃO COM RECOVERY ===
    async execute(asyncFunction, context = {}) {
        this.stats.total_executions++;
        
        let lastError = null;
        let attempt = 0;
        
        while (attempt < this.maxRetries) {
            try {
                console.log(`🔄 Tentativa ${attempt + 1}/${this.maxRetries}${attempt > 0 ? ' (recovery)' : ''}`);
                
                const result = await asyncFunction();
                
                if (attempt > 0) {
                    this.stats.recoveries++;
                    console.log(`✅ Recovery bem-sucedido após ${attempt} tentativas`);
                }
                
                return result;
                
            } catch (error) {
                lastError = error;
                attempt++;
                this.stats.total_failures++;
                
                console.warn(`⚠️ Tentativa ${attempt} falhou: ${error.message}`);
                
                if (attempt < this.maxRetries) {
                    // Calcular delay com backoff exponencial
                    const delay = Math.min(
                        this.baseDelay * Math.pow(this.backoffMultiplier, attempt - 1),
                        this.maxDelay
                    );
                    
                    console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
                    await this.sleep(delay);
                    
                    // Tentar aplicar estratégias de recovery específicas
                    await this.applyRecoveryStrategy(error, attempt, context);
                }
            }
        }
        
        // Todas as tentativas falharam
        this.stats.permanent_failures++;
        console.error(`❌ Recovery permanentemente falhou após ${this.maxRetries} tentativas`);
        
        // Tentar fallback final se disponível
        if (context.fallbackFunction) {
            console.log('🆘 Executando fallback final...');
            try {
                return await context.fallbackFunction(lastError);
            } catch (fallbackError) {
                console.error('❌ Fallback também falhou:', fallbackError.message);
            }
        }
        
        throw lastError;
    }
    
    // === ESTRATÉGIAS DE RECOVERY ===
    async applyRecoveryStrategy(error, attempt, context) {
        const errorType = this.classifyError(error);
        
        switch (errorType) {
            case 'RATE_LIMIT':
                await this.handleRateLimitRecovery(error, attempt, context);
                break;
                
            case 'NETWORK':
                await this.handleNetworkRecovery(error, attempt, context);
                break;
                
            case 'API_ERROR':
                await this.handleApiErrorRecovery(error, attempt, context);
                break;
                
            case 'FILE_SYSTEM':
                await this.handleFileSystemRecovery(error, attempt, context);
                break;
                
            case 'AUTHENTICATION':
                await this.handleAuthRecovery(error, attempt, context);
                break;
                
            default:
                console.log('🤷 Erro não classificado, usando estratégia genérica');
                break;
        }
    }
    
    // === CLASSIFICAÇÃO DE ERROS ===
    classifyError(error) {
        const message = error.message.toLowerCase();
        
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || 
            message.includes('network') || message.includes('timeout')) {
            return 'NETWORK';
        }
        
        if (error.response?.status === 429 || message.includes('rate limit')) {
            return 'RATE_LIMIT';
        }
        
        if (error.response?.status === 401 || error.response?.status === 403 || 
            message.includes('unauthorized') || message.includes('invalid api key')) {
            return 'AUTHENTICATION';
        }
        
        if (error.code === 'ENOENT' || error.code === 'EACCES' || 
            message.includes('no such file') || message.includes('permission denied')) {
            return 'FILE_SYSTEM';
        }
        
        if (error.response?.status >= 500 || message.includes('api') || 
            message.includes('server error')) {
            return 'API_ERROR';
        }
        
        return 'UNKNOWN';
    }
    
    // === HANDLERS ESPECÍFICOS ===
    async handleRateLimitRecovery(error, attempt, context) {
        console.log('🚦 Detectado rate limit, aumentando delay...');
        
        // Delay extra para rate limit
        const extraDelay = Math.min(5000 * attempt, 30000);
        await this.sleep(extraDelay);
        
        // Tentar trocar API key se disponível
        if (context.switchApiKey) {
            console.log('🔄 Tentando trocar API key...');
            await context.switchApiKey();
        }
    }
    
    async handleNetworkRecovery(error, attempt, context) {
        console.log('🌐 Problema de rede detectado, aguardando...');
        
        // Delay progressivo para problemas de rede
        const networkDelay = Math.min(2000 * attempt, 15000);
        await this.sleep(networkDelay);
        
        // Verificar conectividade se possível
        if (context.checkConnectivity) {
            await context.checkConnectivity();
        }
    }
    
    async handleApiErrorRecovery(error, attempt, context) {
        console.log('🔧 Erro de API detectado, ajustando parâmetros...');
        
        // Tentar ajustar parâmetros da requisição
        if (context.adjustParameters) {
            console.log('⚙️ Ajustando parâmetros da requisição...');
            await context.adjustParameters(error, attempt);
        }
        
        // Usar endpoint alternativo se disponível
        if (context.useAlternativeEndpoint) {
            console.log('🔄 Tentando endpoint alternativo...');
            await context.useAlternativeEndpoint();
        }
    }
    
    async handleFileSystemRecovery(error, attempt, context) {
        console.log('📁 Problema de sistema de arquivos detectado...');
        
        // Tentar criar diretórios se necessário
        if (context.ensureDirectories) {
            console.log('📁 Garantindo que diretórios existem...');
            await context.ensureDirectories();
        }
        
        // Verificar permissões
        if (context.checkPermissions) {
            await context.checkPermissions();
        }
    }
    
    async handleAuthRecovery(error, attempt, context) {
        console.log('🔐 Problema de autenticação detectado...');
        
        // Tentar renovar token se possível
        if (context.refreshToken) {
            console.log('🔄 Tentando renovar token...');
            await context.refreshToken();
        }
        
        // Usar credencial alternativa
        if (context.useAlternativeCredential) {
            console.log('🔑 Tentando credencial alternativa...');
            await context.useAlternativeCredential();
        }
    }
    
    // === UTILIDADES ===
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // === WRAPPER PARA FUNÇÕES COMUNS ===
    async executeWithRetry(fn, options = {}) {
        return this.execute(fn, {
            fallbackFunction: options.fallback,
            switchApiKey: options.onRateLimit,
            adjustParameters: options.onApiError,
            ensureDirectories: options.onFileError,
            refreshToken: options.onAuthError
        });
    }
    
    // === RECOVERY PARA OPERAÇÕES ESPECÍFICAS ===
    async executeApiCall(apiFunction, options = {}) {
        return this.execute(apiFunction, {
            switchApiKey: options.switchApiKey,
            useAlternativeEndpoint: options.useAlternativeEndpoint,
            adjustParameters: (error, attempt) => {
                // Reduzir parâmetros em caso de erro
                if (options.reduceComplexity) {
                    options.reduceComplexity(attempt);
                }
            },
            fallbackFunction: options.fallback
        });
    }
    
    async executeFileOperation(fileFunction, options = {}) {
        return this.execute(fileFunction, {
            ensureDirectories: options.ensureDirectories,
            checkPermissions: options.checkPermissions,
            fallbackFunction: options.fallback
        });
    }
    
    // === ESTATÍSTICAS ===
    getStats() {
        const successRate = this.stats.total_executions > 0 ?
            ((this.stats.total_executions - this.stats.permanent_failures) / this.stats.total_executions * 100).toFixed(1)
            : 100;
            
        const recoveryRate = this.stats.total_failures > 0 ?
            (this.stats.recoveries / this.stats.total_failures * 100).toFixed(1)
            : 0;
            
        return {
            ...this.stats,
            success_rate: `${successRate}%`,
            recovery_rate: `${recoveryRate}%`
        };
    }
    
    printStats() {
        const stats = this.getStats();
        
        console.log('\n🔄 AUTO RECOVERY STATS');
        console.log('=======================');
        console.log(`📈 Total Executions: ${stats.total_executions}`);
        console.log(`✅ Success Rate: ${stats.success_rate}`);
        console.log(`🔄 Recoveries: ${stats.recoveries}`);
        console.log(`📊 Recovery Rate: ${stats.recovery_rate}`);
        console.log(`❌ Permanent Failures: ${stats.permanent_failures}`);
        console.log('=======================\n');
    }
    
    reset() {
        this.stats = {
            total_executions: 0,
            total_failures: 0,
            recoveries: 0,
            permanent_failures: 0
        };
        
        console.log('🔄 Auto Recovery stats resetadas');
    }
}

module.exports = AutoRecovery;