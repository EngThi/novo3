const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const axios = require('axios');

class StorageManagerFree {
    constructor() {
        this.storageOptions = [
            {
                name: 'local',
                type: 'filesystem',
                unlimited: true,
                cost: 'free'
            },
            {
                name: 'supabase',
                type: 'cloud',
                free_tier: '1GB + 2GB bandwidth',
                api: process.env.SUPABASE_URL
            },
            {
                name: 'cloudflare-r2',
                type: 'cloud',
                free_tier: '10GB + 1M operations',
                api: process.env.CLOUDFLARE_R2_ENDPOINT
            },
            {
                name: 'backblaze-b2',
                type: 'cloud',
                free_tier: '10GB + 1GB daily egress',
                api: process.env.BACKBLAZE_B2_ENDPOINT
            }
        ];
        
        this.baseLocalPath = process.env.STORAGE_BASE_PATH || './storage';
        this.backupEnabled = process.env.ENABLE_CLOUD_BACKUP === 'true';
    }

    async ensureLocalStorage() {
        try {
            await fs.access(this.baseLocalPath);
        } catch {
            await fs.mkdir(this.baseLocalPath, { recursive: true });
        }
    }

    async saveAllAssets(assets, executionId) {
        await this.ensureLocalStorage();
        
        const executionPath = path.join(this.baseLocalPath, executionId);
        await fs.mkdir(executionPath, { recursive: true });
        
        const results = {
            executionId,
            localPaths: {},
            cloudUrls: {},
            metadata: {
                saved_at: new Date().toISOString(),
                storage_type: 'local',
                backup_enabled: this.backupEnabled
            }
        };
        
        // Salvar cada asset localmente
        for (const [assetType, assetPath] of Object.entries(assets)) {
            if (Array.isArray(assetPath)) {
                // Para arrays (como imagens)
                results.localPaths[assetType] = [];
                results.cloudUrls[assetType] = [];
                
                for (let i = 0; i < assetPath.length; i++) {
                    const localPath = await this.saveAssetLocally(assetPath[i], executionPath, `${assetType}_${i+1}`);
                    results.localPaths[assetType].push(localPath);
                    
                    if (this.backupEnabled) {
                        try {
                            const cloudUrl = await this.backupToCloud(localPath, executionId, `${assetType}_${i+1}`);
                            results.cloudUrls[assetType].push(cloudUrl);
                        } catch (error) {
                            console.warn(`Backup para nuvem falhou para ${assetType}_${i+1}:`, error.message);
                            results.cloudUrls[assetType].push(null);
                        }
                    }
                }
            } else if (typeof assetPath === 'string' && assetType !== 'script') {
                // Para arquivos únicos
                const localPath = await this.saveAssetLocally(assetPath, executionPath, assetType);
                results.localPaths[assetType] = localPath;
                
                if (this.backupEnabled) {
                    try {
                        results.cloudUrls[assetType] = await this.backupToCloud(localPath, executionId, assetType);
                    } catch (error) {
                        console.warn(`Backup para nuvem falhou para ${assetType}:`, error.message);
                        results.cloudUrls[assetType] = null;
                    }
                }
            } else if (assetType === 'script') {
                // Para conteúdo de texto (script)
                const scriptPath = path.join(executionPath, 'roteiro.txt');
                await fs.writeFile(scriptPath, assetPath, 'utf8');
                results.localPaths[assetType] = scriptPath;
                
                if (this.backupEnabled) {
                    try {
                        results.cloudUrls[assetType] = await this.backupToCloud(scriptPath, executionId, 'roteiro');
                    } catch (error) {
                        console.warn(`Backup do roteiro para nuvem falhou:`, error.message);
                        results.cloudUrls[assetType] = null;
                    }
                }
            }
        }
        
        // Salvar manifesto de execução
        const manifestPath = path.join(executionPath, 'manifest.json');
        await fs.writeFile(manifestPath, JSON.stringify(results, null, 2));
        
        console.log(`✅ Assets salvos localmente em: ${executionPath}`);
        if (this.backupEnabled) {
            console.log('☁️ Backup na nuvem tentado para todos os assets');
        }
        
        return results;
    }

    async saveAssetLocally(sourcePath, targetDir, name) {
        const sourceExt = path.extname(sourcePath);
        const targetPath = path.join(targetDir, `${name}${sourceExt}`);
        
        try {
            // Copiar arquivo para o diretório de armazenamento
            await fs.copyFile(sourcePath, targetPath);
            console.log(`📁 Salvo localmente: ${name}${sourceExt}`);
            return targetPath;
        } catch (error) {
            console.error(`Erro ao salvar ${name}:`, error.message);
            throw error;
        }
    }

    async backupToCloud(filePath, executionId, assetName) {
        // Tentar cada serviço de nuvem disponível
        const cloudServices = this.storageOptions.filter(s => s.type === 'cloud' && s.api);
        
        for (const service of cloudServices) {
            try {
                console.log(`☁️ Tentando backup com ${service.name}...`);
                
                switch (service.name) {
                    case 'supabase':
                        return await this.uploadToSupabase(filePath, executionId, assetName);
                    case 'cloudflare-r2':
                        return await this.uploadToCloudflareR2(filePath, executionId, assetName);
                    case 'backblaze-b2':
                        return await this.uploadToBackblazeB2(filePath, executionId, assetName);
                }
            } catch (error) {
                console.warn(`${service.name} backup falhou:`, error.message);
                continue;
            }
        }
        
        throw new Error('Todos os serviços de backup na nuvem falharam');
    }

    async uploadToSupabase(filePath, executionId, assetName) {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
            throw new Error('Credenciais do Supabase não configuradas');
        }
        
        const fileBuffer = await fs.readFile(filePath);
        const fileName = `${executionId}/${assetName}${path.extname(filePath)}`;
        
        const response = await axios.post(
            `${process.env.SUPABASE_URL}/storage/v1/object/video-assets/${fileName}`,
            fileBuffer,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/octet-stream'
                }
            }
        );
        
        return `${process.env.SUPABASE_URL}/storage/v1/object/public/video-assets/${fileName}`;
    }

    async uploadToCloudflareR2(filePath, executionId, assetName) {
        if (!process.env.CLOUDFLARE_R2_ENDPOINT || !process.env.CLOUDFLARE_R2_ACCESS_KEY) {
            throw new Error('Credenciais do Cloudflare R2 não configuradas');
        }
        
        // Implementar upload S3-compatible para Cloudflare R2
        // Requer AWS SDK ou implementação S3-compatible
        throw new Error('Cloudflare R2 upload não implementado ainda');
    }

    async uploadToBackblazeB2(filePath, executionId, assetName) {
        if (!process.env.BACKBLAZE_B2_ENDPOINT || !process.env.BACKBLAZE_B2_KEY_ID) {
            throw new Error('Credenciais do Backblaze B2 não configuradas');
        }
        
        // Implementar upload para Backblaze B2
        // Requer autenticação específica do B2
        throw new Error('Backblaze B2 upload não implementado ainda');
    }

    async listExecutions() {
        await this.ensureLocalStorage();
        
        try {
            const entries = await fs.readdir(this.baseLocalPath, { withFileTypes: true });
            const executions = [];
            
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const manifestPath = path.join(this.baseLocalPath, entry.name, 'manifest.json');
                    
                    try {
                        const manifestData = await fs.readFile(manifestPath, 'utf8');
                        const manifest = JSON.parse(manifestData);
                        executions.push({
                            id: entry.name,
                            ...manifest.metadata,
                            assets_count: Object.keys(manifest.localPaths).length
                        });
                    } catch {
                        // Se não há manifesto, apenas listar como diretório
                        executions.push({
                            id: entry.name,
                            type: 'legacy',
                            saved_at: 'unknown'
                        });
                    }
                }
            }
            
            return executions.sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at));
        } catch (error) {
            console.error('Erro ao listar execuções:', error.message);
            return [];
        }
    }

    async getExecutionAssets(executionId) {
        const executionPath = path.join(this.baseLocalPath, executionId);
        const manifestPath = path.join(executionPath, 'manifest.json');
        
        try {
            const manifestData = await fs.readFile(manifestPath, 'utf8');
            return JSON.parse(manifestData);
        } catch (error) {
            throw new Error(`Manifesto não encontrado para execução ${executionId}`);
        }
    }

    async deleteExecution(executionId) {
        const executionPath = path.join(this.baseLocalPath, executionId);
        
        try {
            await fs.rm(executionPath, { recursive: true, force: true });
            console.log(`🗑️ Execução ${executionId} removida com sucesso`);
            return true;
        } catch (error) {
            console.error(`Erro ao remover execução ${executionId}:`, error.message);
            return false;
        }
    }
}

module.exports = StorageManagerFree;