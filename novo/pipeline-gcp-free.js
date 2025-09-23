require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const axios = require('axios');
const PipelineStateManager = require('./stateManager');

// Importar módulos alternativos
const ImageGenerator = require('./modules/image-generator-free');
const TTSGenerator = require('./modules/tts-generator-free');
const VideoProcessor = require('./modules/video-processor-free');
const StorageManager = require('./modules/storage-manager-free');

// === CONFIGURAÇÃO SEM GCP ===
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_DRIVE_REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SHEET_NAME = "T";
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const OAUTH_CLIENT_ID = '1060201687476-0c6m7fb4ttsmg84uibe6jh8utbmplr11.apps.googleusercontent.com';
const OAUTH_CLIENT_SECRET = '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';
const OAUTH_REDIRECT_URI = 'http://localhost:8080';
const BASE_OUTPUT_PATH = 'novo/output';

// === INICIALIZAR MÓDULOS ALTERNATIVOS ===
const imageGen = new ImageGenerator();
const ttsGen = new TTSGenerator();
const videoProc = new VideoProcessor();
const storage = new StorageManager();

// === FUNÇÕES AUXILIARES (mantidas) ===
function classifyError(error) {
    const message = (error.message || '').toLowerCase();
    const status = error.status || error.code;
    if (status >= 500 || message.includes('timeout') || message.includes('ratelimit') || message.includes('flaky')) {
        return 'RETRIABLE';
    }
    return 'FATAL';
}

async function retryWithBackoff(fn, retries = 3, delay = 1000) {
    try {
        return await fn();
    } catch (error) {
        if (retries > 0 && classifyError(error) === 'RETRIABLE') {
            console.warn(`[RETRY] Erro retriável detectado. Tentando novamente em ${delay}ms... (Tentativas restantes: ${retries})`);
            await new Promise(res => setTimeout(res, delay));
            return retryWithBackoff(fn, retries - 1, delay * 2);
        } else {
            throw error;
        }
    }
}

async function sendToDiscord(message, isError = false) {
    const embed = {
        title: isError ? '❌ Pipeline Falhou!' : '✅ Pipeline Concluído!',
        description: `${message}\n\n🆆 **GCP-FREE VERSION**`,
        color: isError ? 15158332 : 3066993,
        timestamp: new Date().toISOString(),
        footer: { text: 'novo3 - Versão sem dependências GCP' }
    };
    
    if (isError) {
        embed.title = '❌ Pipeline Falhou!';
        embed.color = 15158332;
    } else if (message.includes("iniciado")) {
        embed.title = '🚀 Pipeline Iniciado!';
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

// === FUNÇÕES DO PIPELINE ATUALIZADAS ===
async function descobrirConteudo() {
    console.log("ETAPA 1: Descobrindo conteúdo...");
    const prompt = 'Sugira um tópico de vídeo sobre mistérios brasileiros que seja interessante e com potencial viral. Retorne apenas o título do tópico.';
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest"});
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
}

async function gerarRoteiro(topic) {
    console.log(`ETAPA 2: Gerando roteiro para: "${topic}"...`);
    const prompt = `Crie um roteiro DETALHADO e conciso para um vídeo do YouTube com o título "${topic}". O roteiro deve ter NO MÁXIMO 500 palavras, dividido em introdução, 3 seções principais e uma conclusão. **Importante: inclua timestamps (ex: [00:15])** para indicar a mudança de cenas ou ênfase visual no roteiro.`;
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest"});
    const result = await model.generateContent(prompt);
    return result.response.text();
}

async function criarPromptsDeImagem(script) {
    console.log("ETAPA 3: Criando prompts de imagem...");
    const prompt = `Sua tarefa é analisar um roteiro de vídeo e gerar prompts para um modelo de imagem. Analise o roteiro dentro das tags <roteiro>${script}</roteiro>. Extraia 5 cenas visuais cruciais. Para cada cena, crie um prompt principal e um prompt negativo. - O prompt principal deve ser em inglês, detalhado, com estilo fotorealístico e **seguro para todos os públicos (safe for work)**. Evite gerar imagens de pessoas ou tópicos controversos. - O prompt negativo deve listar elementos a serem evitados, como 'desenho, texto, logos, feio, deformado'. Sua resposta deve ser APENAS um array JSON contendo 5 objetos. Cada objeto deve ter as chaves "prompt" e "negativePrompt".`;
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest"});
    const result = await model.generateContent(prompt);
    let jsonString = result.response.text().trim().replace(/```json/g, "").replace(/```/g, "");
    return JSON.parse(jsonString);
}

// === NOVAS FUNÇÕES SEM GCP ===
async function gerarImagensAlternativas(prompts, executionId, executionPath) {
    console.log("ETAPA 4: Gerando imagens com serviços alternativos...");
    const imageDir = path.join(executionPath, 'images');
    await fs.mkdir(imageDir, { recursive: true });
    
    try {
        // Tentar gerar com serviços gratuitos
        const images = await imageGen.generateImages(prompts, imageDir, executionId);
        return {
            localPaths: images.map(img => img.path),
            metadata: images.map(img => img.metadata)
        };
    } catch (error) {
        console.error('Erro na geração de imagens:', error);
        // Fallback: usar imagens placeholder
        return await imageGen.generatePlaceholders(prompts, imageDir, executionId);
    }
}

async function gerarNarracaoAlternativa(script, executionId, executionPath) {
    console.log("ETAPA 5: Gerando narração com TTS alternativo...");
    
    try {
        // Tentar com Mozilla TTS primeiro
        const audioPath = await ttsGen.generateWithMozillaTTS(script, executionPath, executionId);
        return { localPath: audioPath, service: 'Mozilla TTS' };
    } catch (error) {
        console.warn('Mozilla TTS falhou, tentando eSpeak:', error.message);
        try {
            // Fallback para eSpeak
            const audioPath = await ttsGen.generateWithEspeak(script, executionPath, executionId);
            return { localPath: audioPath, service: 'eSpeak' };
        } catch (espeak_error) {
            console.warn('eSpeak falhou, tentando gTTS online:', espeak_error.message);
            // Último fallback: gTTS (online mas gratuito)
            const audioPath = await ttsGen.generateWithGTTS(script, executionPath, executionId);
            return { localPath: audioPath, service: 'gTTS' };
        }
    }
}

async function montarVideoAlternativo(narrationPath, imagePaths, executionId, executionPath) {
    console.log("ETAPA 6: Montando vídeo com FFmpeg local...");
    const outputPath = path.join(executionPath, `${executionId}_video_final.mp4`);
    
    try {
        // Usar Editly para montagem declarativa
        await videoProc.createVideoWithEditly({
            images: imagePaths,
            audio: narrationPath,
            output: outputPath,
            executionId
        });
        
        return outputPath;
    } catch (error) {
        console.warn('Editly falhou, tentando FFmpeg direto:', error.message);
        // Fallback: FFmpeg com fluent-ffmpeg
        return await videoProc.createVideoWithFFmpeg({
            images: imagePaths,
            audio: narrationPath,
            output: outputPath
        });
    }
}

// === ORQUESTRADOR PRINCIPAL ===
async function runGCPFreePipeline(executionId = null) {
    await sendToDiscord('🚀 Pipeline GCP-Free iniciado!', false);
    
    const oauth2Client = new google.auth.OAuth2(OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REDIRECT_URI);
    oauth2Client.setCredentials({ refresh_token: GOOGLE_DRIVE_REFRESH_TOKEN });
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    const stateManager = new PipelineStateManager(sheets, GOOGLE_SHEET_ID, GOOGLE_SHEET_NAME);

    try {
        // Gerar tópico se necessário
        if (!executionId) {
            const topic = await descobrirConteudo();
            executionId = await stateManager.createExecution(topic);
        }
        
        let state = await stateManager.getExecutionState(executionId);
        if (!state) throw new Error(`Estado não encontrado para ${executionId}`);
        
        const executionPath = path.join(BASE_OUTPUT_PATH, executionId);
        await fs.mkdir(executionPath, { recursive: true });

        // Executar pipeline com alternativas
        let scriptContent, imagePrompts, imagesResult, audioResult;
        
        // Etapa 2: Roteiro
        if (!state.scriptContent) {
            scriptContent = await retryWithBackoff(() => gerarRoteiro(state.topic));
            await stateManager.updateState(executionId, 'SCRIPT_COMPLETE', { E: scriptContent });
        } else {
            scriptContent = state.scriptContent;
        }
        
        // Etapa 3: Prompts de imagem
        if (!state.imagePrompts) {
            imagePrompts = await retryWithBackoff(() => criarPromptsDeImagem(scriptContent));
            await stateManager.updateState(executionId, 'PROMPTS_COMPLETE', { F: JSON.stringify(imagePrompts) });
        } else {
            imagePrompts = typeof state.imagePrompts === 'string' ? JSON.parse(state.imagePrompts) : state.imagePrompts;
        }
        
        // Etapa 4: Imagens (SEM GCP)
        imagesResult = await retryWithBackoff(() => gerarImagensAlternativas(imagePrompts, executionId, executionPath));
        await stateManager.updateState(executionId, 'IMAGES_COMPLETE', { G: 'Local: ' + imagesResult.localPaths.length + ' imagens' });
        
        // Etapa 5: Narração (SEM GCP)
        audioResult = await retryWithBackoff(() => gerarNarracaoAlternativa(scriptContent, executionId, executionPath));
        await stateManager.updateState(executionId, 'AUDIO_COMPLETE', { H: `Local: ${audioResult.service}` });
        
        // Etapa 6: Montagem de vídeo
        const finalVideoPath = await retryWithBackoff(() => montarVideoAlternativo(
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
            I: `Local: ${finalVideoPath}`,
            L: JSON.stringify(storageResult)
        });

        await sendToDiscord(`✅ Pipeline GCP-Free para "${state.topic}" concluído com sucesso!\n\n🎥 Vídeo: ${path.basename(finalVideoPath)}\n🎧 Áudio: ${audioResult.service}\n🖼️ Imagens: ${imagesResult.localPaths.length}`, false);

    } catch (error) {
        console.error("Pipeline GCP-Free falhou!", error.message);
        await sendToDiscord(`**Erro na execução ${executionId}:** ${error.message}`, true);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const executionId = process.argv[2] || null;
    runGCPFreePipeline(executionId).catch(console.error);
}

module.exports = { runGCPFreePipeline };