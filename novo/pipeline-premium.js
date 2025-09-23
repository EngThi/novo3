require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const axios = require('axios');
const PipelineStateManager = require('./stateManager');

// Importar módulos premium
const ImageGeneratorPremium = require('./modules/image-generator-premium');
const TTSGeneratorPremium = require('./modules/tts-generator-premium');
const VideoProcessor = require('./modules/video-processor-free');
const StorageManager = require('./modules/storage-manager-free');
const CredentialManager = require('./modules/credential-manager');

// === CONFIGURAÇÃO PREMIUM ===
const GOOGLE_DRIVE_REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SHEET_NAME = "T";
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const OAUTH_CLIENT_ID = '1060201687476-0c6m7fb4ttsmg84uibe6jh8utbmplr11.apps.googleusercontent.com';
const OAUTH_CLIENT_SECRET = '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';
const OAUTH_REDIRECT_URI = 'http://localhost:8080';
const BASE_OUTPUT_PATH = 'novo/output';

// === INICIALIZAR MÓDULOS PREMIUM ===
const credentialManager = new CredentialManager();
const imageGen = new ImageGeneratorPremium();
const ttsGen = new TTSGeneratorPremium();
const videoProc = new VideoProcessor();
const storage = new StorageManager();

// === FUNÇÕES DE RETRY E ERRO ===
function classifyError(error) {
    const message = (error.message || '').toLowerCase();
    const status = error.status || error.code;
    
    // Erros de quota/rate limit são temporários
    if (status === 429 || message.includes('quota') || message.includes('rate limit') || 
        message.includes('temporarily unavailable') || message.includes('503')) {
        return 'RETRIABLE';
    }
    
    // Erros de rede são temporários
    if (status >= 500 || message.includes('timeout') || message.includes('network') || 
        message.includes('connection') || message.includes('econnreset')) {
        return 'RETRIABLE';
    }
    
    return 'FATAL';
}

async function retryWithBackoff(fn, retries = 3, delay = 2000) {
    try {
        return await fn();
    } catch (error) {
        if (retries > 0 && classifyError(error) === 'RETRIABLE') {
            console.warn(`[RETRY] Erro retriável detectado. Tentando novamente em ${delay}ms... (Tentativas restantes: ${retries})`);
            console.warn(`[RETRY] Erro: ${error.message}`);
            await new Promise(res => setTimeout(res, delay));
            return retryWithBackoff(fn, retries - 1, delay * 2);
        } else {
            throw error;
        }
    }
}

// === NOTIFICAÇÕES DISCORD ===
async function sendToDiscord(message, isError = false) {
    const embed = {
        title: isError ? '❌ Pipeline Premium Falhou!' : '✅ Pipeline Premium Concluído!',
        description: `${message}\n\n🚀 **PREMIUM VERSION - Multi-API**`,
        color: isError ? 15158332 : 3066993,
        timestamp: new Date().toISOString(),
        footer: { text: 'novo3 - Versão Premium com APIs múltiplas' },
        fields: []
    };
    
    if (isError) {
        embed.title = '❌ Pipeline Premium Falhou!';
        embed.color = 15158332;
    } else if (message.includes("iniciado")) {
        embed.title = '🚀 Pipeline Premium Iniciado!';
        embed.color = 3447003;
    }
    
    try {
        if (DISCORD_WEBHOOK_URL) {
            await axios.post(DISCORD_WEBHOOK_URL, { embeds: [embed] });
        }
    } catch (error) {
        console.error("Erro ao enviar notificação para o Discord:", error.message);
    }
}

// === GESTÃO INTELIGENTE DE GEMINI ===
async function getGeminiModel() {
    try {
        const credential = await credentialManager.getNextCredential('gemini');
        const genAI = new GoogleGenerativeAI(credential.api_key);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest"});
        return { model, credential };
    } catch (error) {
        // Fallback para variável de ambiente
        if (process.env.GEMINI_API_KEY) {
            console.warn('Usando Gemini API key de fallback do environment');
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest"});
            return { model, credential: null };
        }
        throw new Error('Nenhuma credencial Gemini disponível');
    }
}

// === FUNÇÕES DO PIPELINE OTIMIZADAS ===
async function descobrirConteudo() {
    console.log("ETAPA 1: Descobrindo conteúdo...");
    const prompt = 'Sugira um tópico de vídeo sobre mistérios brasileiros que seja interessante e com potencial viral. Retorne apenas o título do tópico.';
    
    const { model, credential } = await getGeminiModel();
    
    try {
        const result = await model.generateContent(prompt);
        
        if (credential) {
            await credentialManager.recordUsage(credential, 'gemini', true);
        }
        
        return result.response.text().trim();
    } catch (error) {
        if (credential) {
            await credentialManager.recordFailure(credential, 'gemini', error);
        }
        throw error;
    }
}

async function gerarRoteiro(topic) {
    console.log(`ETAPA 2: Gerando roteiro para: "${topic}"...`);
    const prompt = `Crie um roteiro DETALHADO e conciso para um vídeo do YouTube com o título "${topic}". O roteiro deve ter NO MÁXIMO 500 palavras, dividido em introdução, 3 seções principais e uma conclusão. **Importante: inclua timestamps (ex: [00:15])** para indicar a mudança de cenas ou ênfase visual no roteiro.`;
    
    const { model, credential } = await getGeminiModel();
    
    try {
        const result = await model.generateContent(prompt);
        
        if (credential) {
            await credentialManager.recordUsage(credential, 'gemini', true);
        }
        
        return result.response.text();
    } catch (error) {
        if (credential) {
            await credentialManager.recordFailure(credential, 'gemini', error);
        }
        throw error;
    }
}

async function criarPromptsDeImagem(script) {
    console.log("ETAPA 3: Criando prompts de imagem...");
    const prompt = `Sua tarefa é analisar um roteiro de vídeo e gerar prompts para um modelo de imagem. Analise o roteiro dentro das tags <roteiro>${script}</roteiro>. Extraia 5 cenas visuais cruciais. Para cada cena, crie um prompt principal e um prompt negativo. - O prompt principal deve ser em inglês, detalhado, com estilo fotorealístico e **seguro para todos os públicos (safe for work)**. Evite gerar imagens de pessoas ou tópicos controversos. - O prompt negativo deve listar elementos a serem evitados, como 'desenho, texto, logos, feio, deformado'. Sua resposta deve ser APENAS um array JSON contendo 5 objetos. Cada objeto deve ter as chaves "prompt" e "negativePrompt".`;
    
    const { model, credential } = await getGeminiModel();
    
    try {
        const result = await model.generateContent(prompt);
        
        if (credential) {
            await credentialManager.recordUsage(credential, 'gemini', true);
        }
        
        let jsonString = result.response.text().trim().replace(/```json/g, "").replace(/```/g, "");
        return JSON.parse(jsonString);
    } catch (error) {
        if (credential) {
            await credentialManager.recordFailure(credential, 'gemini', error);
        }
        throw error;
    }
}

// === FUNÇÕES PREMIUM COM MÚLTIPLAS APIS ===
async function gerarImagensPremium(prompts, executionId, executionPath) {
    console.log("ETAPA 4: Gerando imagens com APIs premium...");
    const imageDir = path.join(executionPath, 'images');
    await fs.mkdir(imageDir, { recursive: true });
    
    const images = await imageGen.generateImages(prompts, imageDir, executionId);
    
    return {
        localPaths: images.map(img => img.path),
        metadata: images.map(img => ({ 
            ...img.metadata, 
            service: img.service, 
            quality: img.quality 
        }))
    };
}

async function gerarNarracaoPremium(script, executionId, executionPath, options = {}) {
    console.log("ETAPA 5: Gerando narração com TTS premium...");
    
    const audioResult = await ttsGen.generateAudio(script, executionPath, executionId, {
        language: options.language || 'pt',
        voice: options.voice || 'female'
    });
    
    return audioResult;
}

async function montarVideoAvancado(narrationPath, imagePaths, executionId, executionPath) {
    console.log("ETAPA 6: Montando vídeo com processamento avançado...");
    const outputPath = path.join(executionPath, `${executionId}_video_final.mp4`);
    
    const videoPath = await videoProc.createVideo({
        images: imagePaths,
        audio: narrationPath,
        output: outputPath,
        executionId
    });
    
    return videoPath;
}

// === ORQUESTRADOR PRINCIPAL PREMIUM ===
async function runPremiumPipeline(executionId = null, options = {}) {
    const startTime = Date.now();
    
    await sendToDiscord('🚀 Pipeline Premium iniciado com múltiplas APIs!', false);
    
    const oauth2Client = new google.auth.OAuth2(OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REDIRECT_URI);
    oauth2Client.setCredentials({ refresh_token: GOOGLE_DRIVE_REFRESH_TOKEN });
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    const stateManager = new PipelineStateManager(sheets, GOOGLE_SHEET_ID, GOOGLE_SHEET_NAME);

    try {
        // Configurar todas as APIs
        console.log('🔧 Configurando APIs premium...');
        await imageGen.setupAPIs();
        await ttsGen.setupAPIs();
        
        // Gerar tópico se necessário
        if (!executionId) {
            const topic = await retryWithBackoff(() => descobrirConteudo());
            executionId = await stateManager.createExecution(topic);
            console.log(`📝 Novo tópico criado: "${topic}" (ID: ${executionId})`);
        }
        
        let state = await stateManager.getExecutionState(executionId);
        if (!state) throw new Error(`Estado não encontrado para ${executionId}`);
        
        const executionPath = path.join(BASE_OUTPUT_PATH, executionId);
        await fs.mkdir(executionPath, { recursive: true });

        // Executar pipeline com APIs premium
        let scriptContent, imagePrompts, imagesResult, audioResult;
        
        // Etapa 2: Roteiro
        if (!state.scriptContent) {
            console.log('📜 Gerando roteiro...');
            scriptContent = await retryWithBackoff(() => gerarRoteiro(state.topic));
            await stateManager.updateState(executionId, 'SCRIPT_COMPLETE', { E: scriptContent });
        } else {
            scriptContent = state.scriptContent;
            console.log('📜 Roteiro já existe, reutilizando...');
        }
        
        // Etapa 3: Prompts de imagem
        if (!state.imagePrompts) {
            console.log('🎨 Criando prompts de imagem...');
            imagePrompts = await retryWithBackoff(() => criarPromptsDeImagem(scriptContent));
            await stateManager.updateState(executionId, 'PROMPTS_COMPLETE', { F: JSON.stringify(imagePrompts) });
        } else {
            imagePrompts = typeof state.imagePrompts === 'string' ? JSON.parse(state.imagePrompts) : state.imagePrompts;
            console.log('🎨 Prompts já existem, reutilizando...');
        }
        
        // Etapa 4: Imagens com APIs premium
        imagesResult = await retryWithBackoff(() => gerarImagensPremium(imagePrompts, executionId, executionPath));
        const imageServices = imagesResult.metadata.map(m => m.service).join(', ');
        await stateManager.updateState(executionId, 'IMAGES_COMPLETE', { 
            G: `Premium: ${imagesResult.localPaths.length} imagens (${imageServices})` 
        });
        
        // Etapa 5: Narração com TTS premium
        audioResult = await retryWithBackoff(() => gerarNarracaoPremium(scriptContent, executionId, executionPath, options.tts));
        await stateManager.updateState(executionId, 'AUDIO_COMPLETE', { 
            H: `Premium: ${audioResult.service} (${audioResult.quality})` 
        });
        
        // Etapa 6: Montagem de vídeo
        const finalVideoPath = await retryWithBackoff(() => montarVideoAvancado(
            audioResult.localPath, 
            imagesResult.localPaths, 
            executionId, 
            executionPath
        ));
        
        // Etapa 7: Armazenamento e backup
        const storageResult = await storage.saveAllAssets({
            video: finalVideoPath,
            audio: audioResult.localPath,
            images: imagesResult.localPaths,
            script: scriptContent
        }, executionId);
        
        await stateManager.updateState(executionId, 'COMPLETED', { 
            I: `Premium: ${path.basename(finalVideoPath)}`,
            L: JSON.stringify(storageResult)
        });

        // Estatísticas finais
        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);
        
        const imageStats = await imageGen.getStats();
        const ttsStats = await ttsGen.getStats();
        
        const statsMessage = `
📊 **Estatísticas da Execução:**
⏱️ Duração: ${duration}s
🎨 Imagens: ${imageServices}
🎧 TTS: ${audioResult.service} (${audioResult.quality})
🎥 Vídeo: ${path.basename(finalVideoPath)}
💾 Storage: ${storageResult.metadata.storage_type}`;

        await sendToDiscord(`✅ Pipeline Premium para "${state.topic}" concluído com sucesso!${statsMessage}`, false);

        console.log('\n🎉 Pipeline Premium concluído com sucesso!');
        console.log(`⏱️  Tempo total: ${duration}s`);
        console.log(`🎥 Vídeo final: ${finalVideoPath}`);
        console.log(`📊 APIs utilizadas: ${[...new Set([imageServices, audioResult.service])].join(', ')}`);

    } catch (error) {
        console.error("❌ Pipeline Premium falhou!", error.message);
        await sendToDiscord(`**Erro na execução ${executionId}:** ${error.message}\n\nPipeline Premium interrompido.`, true);
        process.exit(1);
    }
}

// === FUNÇÕES DE CONFIGURAÇÃO ===
async function setupCredentials() {
    console.log('🔐 Configurando credenciais...');
    
    // Adicionar Gemini APIs se disponíveis
    const geminiKeys = [];
    if (process.env.GEMINI_API_KEY) geminiKeys.push(process.env.GEMINI_API_KEY);
    for (let i = 2; i <= 5; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key) geminiKeys.push(key);
    }
    
    for (let i = 0; i < geminiKeys.length; i++) {
        await credentialManager.addGeminiAPI(`Gemini ${i+1}`, geminiKeys[i], {
            quota_limit: 1000,
            quota_reset_period: 'daily'
        });
    }
    
    console.log(`✅ ${geminiKeys.length} APIs Gemini configuradas`);
}

// === INICIALIZAÇÃO E EXECUÇÃO ===
if (require.main === module) {
    const args = process.argv.slice(2);
    const executionId = args[0] || null;
    
    const options = {
        tts: {
            language: args.includes('--lang-en') ? 'en' : 'pt',
            voice: args.includes('--voice-male') ? 'male' : 'female'
        }
    };
    
    (async () => {
        try {
            await setupCredentials();
            await runPremiumPipeline(executionId, options);
        } catch (error) {
            console.error('Erro fatal:', error);
            process.exit(1);
        }
    })();
}

module.exports = { runPremiumPipeline, setupCredentials };