const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Sistema de gerenciamento seguro de credenciais com rotação automática de APIs
 * Suporta múltiplas chaves, quotas, rate limiting e fallback inteligente
 */
class CredentialManager {
    constructor() {
        this.credentialsPath = './novo/credentials.json';
        this.encryptionKey = this.getOrCreateEncryptionKey();
        this.credentials = {};
        this.quotaTracking = {};
        this.rateLimiting = {};
        this.failureTracking = {};
        this.loadCredentials();
    }

    /**
     * Gera ou recupera chave de criptografia
     */
    getOrCreateEncryptionKey() {
        const keyPath = './novo/.encryption-key';
        try {
            if (fssync.existsSync(keyPath)) {
                return fssync.readFileSync(keyPath, 'utf8').trim();
            } else {
                const key = crypto.randomBytes(32).toString('hex');
                fssync.writeFileSync(keyPath, key);
                return key;
            }
        } catch (error) {
            // Fallback: usar chave baseada em environment
            return crypto.createHash('sha256').update(process.env.ENCRYPTION_SEED || 'default-seed').digest('hex');
        }
    }

    /**
     * Criptografa dados sensíveis
     */
    encrypt(text) {
        const algorithm = 'aes-256-cbc';
        const key = Buffer.from(this.encryptionKey, 'hex');
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher(algorithm, key);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return iv.toString('hex') + ':' + encrypted;
    }

    /**
     * Descriptografa dados
     */
    decrypt(encryptedText) {
        try {
            const algorithm = 'aes-256-cbc';
            const key = Buffer.from(this.encryptionKey, 'hex');
            const parts = encryptedText.split(':');
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            
            const decipher = crypto.createDecipher(algorithm, key);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.warn('Erro ao descriptografar:', error.message);
            return encryptedText; // Retorna texto original se falhar
        }
    }

    /**
     * Carrega credenciais do arquivo criptografado
     */
    async loadCredentials() {
        try {
            if (fssync.existsSync(this.credentialsPath)) {
                const encryptedData = await fs.readFile(this.credentialsPath, 'utf8');
                const decryptedData = this.decrypt(encryptedData);
                this.credentials = JSON.parse(decryptedData);
            } else {
                // Criar estrutura inicial
                this.credentials = {
                    image_generation: [],
                    text_to_speech: [],
                    video_processing: [],
                    gemini: []
                };
                await this.saveCredentials();
            }
        } catch (error) {
            console.warn('Erro ao carregar credenciais:', error.message);
            this.credentials = { image_generation: [], text_to_speech: [], video_processing: [], gemini: [] };
        }
    }

    /**
     * Salva credenciais de forma criptografada
     */
    async saveCredentials() {
        try {
            const dataToEncrypt = JSON.stringify(this.credentials, null, 2);
            const encryptedData = this.encrypt(dataToEncrypt);
            await fs.writeFile(this.credentialsPath, encryptedData);
        } catch (error) {
            console.error('Erro ao salvar credenciais:', error.message);
        }
    }

    /**
     * Adiciona nova credencial para um serviço
     */
    async addCredential(service, credentialData) {
        if (!this.credentials[service]) {
            this.credentials[service] = [];
        }
        
        const credential = {
            id: crypto.randomUUID(),
            ...credentialData,
            added_at: new Date().toISOString(),
            active: true,
            usage_count: 0,
            last_used: null,
            quota_limit: credentialData.quota_limit || null,
            quota_reset_period: credentialData.quota_reset_period || 'daily'
        };
        
        this.credentials[service].push(credential);
        await this.saveCredentials();
        
        console.log(`✅ Credencial adicionada para ${service}: ${credential.id}`);
        return credential.id;
    }

    /**
     * Obtém próxima credencial disponível com rotação inteligente
     */
    async getNextCredential(service, options = {}) {
        const availableCredentials = this.credentials[service]?.filter(cred => cred.active) || [];
        
        if (availableCredentials.length === 0) {
            throw new Error(`Nenhuma credencial disponível para ${service}`);
        }

        // Filtrar credenciais com base em quotas e rate limiting
        const validCredentials = availableCredentials.filter(cred => 
            this.isCredentialValid(cred, service)
        );

        if (validCredentials.length === 0) {
            // Se todas estão com problema, tentar resetar quotas expiradas
            this.resetExpiredQuotas(service);
            
            const resetCredentials = availableCredentials.filter(cred => 
                this.isCredentialValid(cred, service)
            );
            
            if (resetCredentials.length === 0) {
                throw new Error(`Todas as credenciais de ${service} estão temporariamente indisponíveis`);
            }
            
            return this.selectBestCredential(resetCredentials, service);
        }

        return this.selectBestCredential(validCredentials, service);
    }

    /**
     * Verifica se credencial é válida (quota, rate limit, falhas)
     */
    isCredentialValid(credential, service) {
        const credId = credential.id;
        const now = Date.now();
        
        // Verificar rate limiting
        const rateLimitKey = `${service}:${credId}`;
        const rateLimit = this.rateLimiting[rateLimitKey];
        if (rateLimit && now < rateLimit.nextAllowedTime) {
            return false;
        }
        
        // Verificar quota
        const quotaKey = `${service}:${credId}`;
        const quota = this.quotaTracking[quotaKey];
        if (quota && credential.quota_limit) {
            if (quota.count >= credential.quota_limit) {
                // Verificar se quota resetou
                if (!this.hasQuotaReset(quota, credential.quota_reset_period)) {
                    return false;
                }
            }
        }
        
        // Verificar falhas recentes
        const failureKey = `${service}:${credId}`;
        const failures = this.failureTracking[failureKey];
        if (failures && failures.consecutive >= 3) {
            // Backoff exponencial após 3 falhas consecutivas
            const backoffTime = Math.pow(2, failures.consecutive - 3) * 60000; // minutos
            if (now < failures.lastFailure + backoffTime) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Seleciona melhor credencial baseada em uso e performance
     */
    selectBestCredential(credentials, service) {
        // Priorizar: menor uso recente, melhor histórico, menor falhas
        const scored = credentials.map(cred => {
            const quotaKey = `${service}:${cred.id}`;
            const failureKey = `${service}:${cred.id}`;
            
            const quota = this.quotaTracking[quotaKey] || { count: 0 };
            const failures = this.failureTracking[failureKey] || { consecutive: 0, total: 0 };
            
            // Score: menor é melhor
            let score = 0;
            score += cred.usage_count * 0.1; // Penalizar uso excessivo
            score += quota.count * 0.5; // Penalizar quota alta
            score += failures.consecutive * 10; // Penalizar falhas consecutivas
            score += failures.total * 1; // Penalizar falhas totais
            
            // Bonus para credenciais menos usadas recentemente
            if (cred.last_used) {
                const hoursSinceLastUse = (Date.now() - new Date(cred.last_used).getTime()) / (1000 * 60 * 60);
                score -= hoursSinceLastUse * 0.1; // Bonus para não usar recentemente
            } else {
                score -= 5; // Bonus para nunca usadas
            }
            
            return { ...cred, score };
        });
        
        // Retornar credencial com menor score
        scored.sort((a, b) => a.score - b.score);
        return scored[0];
    }

    /**
     * Registra uso de credencial
     */
    async recordUsage(credential, service, success = true) {
        const credId = credential.id;
        const now = Date.now();
        
        // Atualizar credencial
        credential.usage_count++;
        credential.last_used = new Date().toISOString();
        
        // Atualizar quota
        const quotaKey = `${service}:${credId}`;
        if (!this.quotaTracking[quotaKey]) {
            this.quotaTracking[quotaKey] = { count: 0, resetTime: this.getNextResetTime(credential.quota_reset_period) };
        }
        this.quotaTracking[quotaKey].count++;
        
        // Atualizar rate limiting
        const rateLimitKey = `${service}:${credId}`;
        this.rateLimiting[rateLimitKey] = {
            nextAllowedTime: now + (credential.rate_limit_ms || 1000) // 1s default
        };
        
        // Atualizar tracking de falhas
        const failureKey = `${service}:${credId}`;
        if (!this.failureTracking[failureKey]) {
            this.failureTracking[failureKey] = { consecutive: 0, total: 0, lastFailure: 0 };
        }
        
        if (success) {
            this.failureTracking[failureKey].consecutive = 0; // Reset falhas consecutivas
        } else {
            this.failureTracking[failureKey].consecutive++;
            this.failureTracking[failureKey].total++;
            this.failureTracking[failureKey].lastFailure = now;
        }
        
        await this.saveCredentials();
    }

    /**
     * Registra falha de credencial
     */
    async recordFailure(credential, service, error) {
        await this.recordUsage(credential, service, false);
        console.warn(`❌ Falha na credencial ${credential.id} (${service}): ${error.message}`);
        
        // Se erro é de quota excedida, marcar credencial
        if (this.isQuotaError(error)) {
            const quotaKey = `${service}:${credential.id}`;
            if (this.quotaTracking[quotaKey]) {
                this.quotaTracking[quotaKey].exceeded = true;
            }
        }
    }

    /**
     * Verifica se erro é relacionado a quota
     */
    isQuotaError(error) {
        const quotaTerms = ['quota', 'limit', 'exceeded', 'rate limit', 'too many requests', '429'];
        const errorStr = error.message.toLowerCase();
        return quotaTerms.some(term => errorStr.includes(term));
    }

    /**
     * Calcula próximo tempo de reset da quota
     */
    getNextResetTime(period) {
        const now = new Date();
        switch (period) {
            case 'hourly':
                return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1).getTime();
            case 'daily':
                return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
            case 'monthly':
                return new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
            default:
                return now.getTime() + 24 * 60 * 60 * 1000; // 24h default
        }
    }

    /**
     * Verifica se quota foi resetada
     */
    hasQuotaReset(quota, period) {
        const now = Date.now();
        if (now >= quota.resetTime) {
            quota.count = 0;
            quota.resetTime = this.getNextResetTime(period);
            quota.exceeded = false;
            return true;
        }
        return false;
    }

    /**
     * Reset quotas expiradas para todos os serviços
     */
    resetExpiredQuotas(service = null) {
        const services = service ? [service] : Object.keys(this.credentials);
        
        for (const svc of services) {
            const credentials = this.credentials[svc] || [];
            for (const cred of credentials) {
                const quotaKey = `${svc}:${cred.id}`;
                const quota = this.quotaTracking[quotaKey];
                if (quota) {
                    this.hasQuotaReset(quota, cred.quota_reset_period);
                }
            }
        }
    }

    /**
     * Obtém estatísticas de uso das credenciais
     */
    getUsageStats(service = null) {
        const services = service ? [service] : Object.keys(this.credentials);
        const stats = {};
        
        for (const svc of services) {
            const credentials = this.credentials[svc] || [];
            stats[svc] = {
                total: credentials.length,
                active: credentials.filter(c => c.active).length,
                total_usage: credentials.reduce((sum, c) => sum + c.usage_count, 0),
                credentials: credentials.map(cred => {
                    const quotaKey = `${svc}:${cred.id}`;
                    const failureKey = `${svc}:${cred.id}`;
                    
                    return {
                        id: cred.id,
                        name: cred.name || 'Unnamed',
                        active: cred.active,
                        usage_count: cred.usage_count,
                        last_used: cred.last_used,
                        quota_used: this.quotaTracking[quotaKey]?.count || 0,
                        quota_limit: cred.quota_limit,
                        failures: this.failureTracking[failureKey]?.total || 0
                    };
                })
            };
        }
        
        return stats;
    }

    /**
     * Método público para adicionar credenciais de forma fácil
     */
    async addImageGenerationAPI(name, apiKey, options = {}) {
        return await this.addCredential('image_generation', {
            name,
            api_key: apiKey,
            service_type: options.service_type || 'unknown',
            quota_limit: options.quota_limit || null,
            quota_reset_period: options.quota_reset_period || 'daily',
            rate_limit_ms: options.rate_limit_ms || 2000,
            ...options
        });
    }

    async addTTSAPI(name, apiKey, options = {}) {
        return await this.addCredential('text_to_speech', {
            name,
            api_key: apiKey,
            service_type: options.service_type || 'unknown',
            quota_limit: options.quota_limit || null,
            quota_reset_period: options.quota_reset_period || 'daily',
            rate_limit_ms: options.rate_limit_ms || 1000,
            ...options
        });
    }

    async addGeminiAPI(name, apiKey, options = {}) {
        return await this.addCredential('gemini', {
            name,
            api_key: apiKey,
            quota_limit: options.quota_limit || 1000,
            quota_reset_period: options.quota_reset_period || 'daily',
            rate_limit_ms: options.rate_limit_ms || 1000,
            ...options
        });
    }
}

module.exports = CredentialManager;