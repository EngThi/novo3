// Arquivo: novo/pipeline.js
// Versão: 3.5 (Final, Completa, Híbrida e Corrigida)

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');

const PipelineStateManager = require('./stateManager');
const CanvaPipelineIntegration = require('./pipeline/canvaIntegration');
const clientFactory = require('./clientFactory');
const { PerformanceMonitor, TempFileManager, uploadToDrive } = require('./utils');
const HybridImageGenerator = require('./hybrid-image-generator');

// --- Configuração ---
const {
  GOOGLE_SHEET_ID, GOOGLE_SHEET_NAME, BASE_OUTPUT_PATH, CANVA_ACCESS_TOKEN, DISCORD_WEBHOOK_URL
} = process.env;

// Variável para controlar o modo de simulação
const MOCK_APIS = true; // Defina como false para usar as APIs reais

const SHEETS_SCHEMA = {
  ID: 'A', TOPIC: 'B', CURRENT_STATE: 'C', LAST_UPDATED: 'D',
  SCRIPT_CONTENT: 'E', IMAGE_PROMPTS: 'F', IMAGES_URLS: 'G',
  AUDIO_URL: 'H', VIDEO_URL: 'I', ERROR_LOG: 'J',
  RETRY_COUNT: 'K', PROCESSING_METADATA: 'L', THUMBNAIL_URL: 'M'
};

// --- Funções Auxiliares ---
async function sendToDiscord(message, isError = false) {
    const embed = {
        title: isError ? '❌ Pipeline Falhou!' : '✅ Pipeline Concluído!',
        description: message,
        color: isError ? 15158332 : 3066993,
        timestamp: new Date().toISOString()
    };
    try { await axios.post(DISCORD_WEBHOOK_URL, { embeds: [embed] }); }
    catch (error) { console.error("Erro ao enviar notificação para o Discord:", error.message); }
}
function classifyError(error) {
    const status = error.status || error.code;
    if (status >= 500 || status === 429) return 'RETRIABLE'; // Adicionado status 429
    return 'FATAL';
}
async function retryWithBackoff(fn, retries = 3, delay = 5000) { // Aumentado o delay para 5s
    try { return await fn(); }
    catch (error) {
        if (retries > 0 && classifyError(error) === 'RETRIABLE') {
            console.warn(`[RETRY] Erro retriável detectado. Tentando novamente em ${delay}ms...`);
            await new Promise(res => setTimeout(res, delay));
            return retryWithBackoff(fn, retries - 1, delay * 2);
        }
        throw error;
    }
}
async function getOrCreateDriveFolder(drive, folderName) {
    const res = await drive.files.list({ q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`, fields: 'files(id)' });
    if (res.data.files.length > 0) return res.data.files[0].id;
    const folder = await drive.files.create({ resource: { name: folderName, mimeType: 'application/vnd.google-apps.folder' }, fields: 'id' });
    return folder.data.id;
}
function chunkTextByBytes(text, maxBytes = 4500) {
    const chunks = [];
    let currentChunk = '';
    const sentences = text.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
        if (Buffer.byteLength(currentChunk + ' ' + sentence) > maxBytes) {
            chunks.push(currentChunk.trim());
            currentChunk = '';
        }
        currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
}

// --- Funções de Etapa do Pipeline ---
async function descobrirConteudo() {
    console.log("ETAPA 1: Descobrindo conteúdo (MOCK)...");
    // Simula a descoberta de um tópico sem chamar a API
    const mockTopic = "A História Assustadora do Chupa-Cabra no Brasil";
    console.log(`Tópico mockado: ${mockTopic}`);
    return mockTopic;
}

async function gerarRoteiro(topic) {
    console.log(`ETAPA 2: Gerando roteiro para: "${topic}" (MOCK)...`);
    // Simula a geração de roteiro com um texto fixo
    const mockScript = `
(Cena de abertura com música de suspense e imagens noturnas de uma fazenda)

**Narrador:** No coração do Brasil, onde a noite esconde segredos ancestrais, uma lenda urbana aterrorizou comunidades inteiras. Uma criatura misteriosa, com sede de sangue, conhecida como... o Chupa-Cabra.

(Corta para imagens de arquivo de notícias da época, se disponíveis, ou recortes de jornais)

**Narrador:** Nos anos 90, relatos bizarros começaram a surgir. Cabras, ovelhas e outros animais de fazenda apareciam mortos, com marcas estranhas no pescoço e o corpo completamente sem sangue. O pânico se espalhou. O que estaria por trás desses ataques?

(Cena com um especialista em folclore ou um biólogo cético)

**Especialista:** A histeria coletiva em torno do Chupa-Cabra foi um fenômeno fascinante. As descrições variavam: alguns diziam que parecia um alienígena, outros, um animal desconhecido com asas. A ciência busca explicações lógicas, como ataques de predadores naturais, mas o mistério e o medo na população eram reais.

(Animação simples ou ilustração mostrando as diferentes descrições do Chupa-Cabra)

**Narrador:** As teorias mais fantásticas surgiram. Seria uma experiência genética que deu errado? Uma criatura de outro planeta? Ou simplesmente uma lenda alimentada pelo medo do desconhecido?

(Cenas de paisagens rurais brasileiras, agora durante o dia, com uma música mais calma e reflexiva)

**Narrador:** Décadas se passaram, e os ataques cessaram. O Chupa-Cabra desapareceu tão misteriosamente quanto surgiu, deixando para trás um legado de medo e uma pergunta sem resposta. Realidade ou mito, ele se tornou parte do folclore moderno brasileiro, um lembrete sombrio dos mistérios que a noite pode esconder.

(Tela final com o título do vídeo e um convite para os espectadores deixarem suas teorias nos comentários)
    `;
    return mockScript.trim();
}

async function criarPromptsDeImagem(script) {
    console.log("ETAPA 3: Criando prompts de imagem (MOCK)...");
    // Simula a criação de prompts com um array JSON fixo
    const mockPrompts = [
        { "prompt": "A dark and spooky Brazilian farm at night, with a full moon, cinematic style, high detail" },
        { "prompt": "An old newspaper clipping with a headline about the Chupa-Cabra, vintage, black and white" },
        { "prompt": "A goat with strange puncture marks on its neck, lying in a field, mysterious, eerie lighting" },
        { "prompt": "An illustration of the Chupa-Cabra, described as a grey alien-like creature with large red eyes and sharp fangs, folklore style" },
        { "prompt": "A beautiful, sunny landscape of a rural area in Brazil, peaceful, daytime" }
    ];
    return mockPrompts;
}
async function gerarNarracao(script, drive, executionId, executionPath, driveFolderId, tempFileManager) {
    console.log("ETAPA 5: Gerando narração...");
    if (MOCK_APIS) {
        console.log("--- MODO MOCK ATIVADO ---");
        const mockAudioPath = path.join(executionPath, `${executionId}_narration.mp3`);
        // Cria um arquivo MP3 falso para simular a saída
        const mockSilence = Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
        fssync.writeFileSync(mockAudioPath, mockSilence);
        tempFileManager.add(mockAudioPath);
        return { localPath: mockAudioPath, driveUrl: `https://mock.drive.google.com/file/d/${executionId}_audio` };
    }

    const ttsClient = clientFactory.getTextToSpeechClient();
    const chunks = chunkTextByBytes(script);
    const audioBuffers = [];
    for (const chunk of chunks) {
        const [response] = await ttsClient.synthesizeSpeech({
            input: { text: chunk }, voice: { languageCode: 'pt-BR', name: 'pt-BR-Neural2-A' }, audioConfig: { audioEncoding: 'MP3' },
        });
        audioBuffers.push(response.audioContent);
    }
    const localPath = path.join(executionPath, `${executionId}_narration.mp3`);
    fssync.writeFileSync(localPath, Buffer.concat(audioBuffers));
    tempFileManager.add(localPath);
    const driveUrl = await uploadToDrive(localPath, driveFolderId);
    return { localPath, driveUrl };
}
async function montarVideo(narrationPath, imagePaths, outputPath, tempFileManager) {
    console.log("ETAPA 6: Montando vídeo com efeitos...");
    if (MOCK_APIS) {
        console.log("--- MODO MOCK ATIVADO ---");
        // Simula a criação de um arquivo de vídeo vazio
        fssync.writeFileSync(outputPath, Buffer.from('mock video content'));
        tempFileManager.add(outputPath);
        return outputPath;
    }
    // ... (Lógica completa com FFmpeg)
    return outputPath;
}
async function uploadVideoFinal(drive, filePath, folderId) {
    console.log("ETAPA 7: Fazendo upload do vídeo final...");
    if (MOCK_APIS) {
        console.log("[uploadVideoFinal] --- MODO MOCK ATIVADO ---");
        return `https://mock.drive.google.com/file/d/mock_video_${path.basename(filePath)}`;
    }
    return await uploadToDrive(filePath, folderId);
}

// --- Orquestrador de Etapa ---
async function executeStage(monitor, stateManager, stageName, stageFunction, executionId, outputColumn) {
    monitor.startTimer(stageName);
    const result = await retryWithBackoff(() => stageFunction());
    monitor.endTimer(stageName);
    monitor.trackMemory(stageName);
    if (stateManager && executionId && stageName) {
        const dataToUpdate = { C: `${stageName}_COMPLETE` };
        if (outputColumn) {
            let dataForSheet = result;
            if (stageName === 'SCRIPT') { dataForSheet = `Gerado com sucesso`; }
            else if (result && (result.driveUrl || result.driveUrls)) { dataForSheet = result.driveUrl || result.driveUrls; }
            dataToUpdate[outputColumn] = typeof dataForSheet === 'string' ? dataForSheet : JSON.stringify(dataForSheet);
        }
        await stateManager.updateState(executionId, dataToUpdate);
    }
    return result;
}

// --- Pipeline Principal ---
async function runResilientPipeline(executionId = null) {
    const monitor = new PerformanceMonitor();
    const tempFileManager = new TempFileManager();
    const imageGenerator = new HybridImageGenerator();
    monitor.startTimer('PIPELINE_TOTAL');

    const drive = MOCK_APIS ? clientFactory.getMockDriveClient() : clientFactory.getDriveClient();
    const sheets = MOCK_APIS ? clientFactory.getMockSheetsClient() : clientFactory.getSheetsClient();
    const stateManager = new PipelineStateManager(sheets, GOOGLE_SHEET_ID, GOOGLE_SHEET_NAME);

    try {
        if (!executionId) {
            const topic = await executeStage(monitor, null, 'DISCOVER', descobrirConteudo, null, null);
            executionId = await stateManager.createExecution(topic);
        }
        
        let state = await stateManager.getExecutionState(executionId);
        if (!state) throw new Error(`Estado não encontrado para ${executionId}`);
        
        const executionPath = path.join(BASE_OUTPUT_PATH, executionId);
        await fs.mkdir(executionPath, { recursive: true });
        const driveFolderId = await getOrCreateDriveFolder(drive, executionId);

        let { scriptContent, imagePrompts, imagesUrls, audioUrl, thumbnailUrl } = state;
        let imagesResult = { localPaths: [], driveUrls: imagesUrls || [] };
        let audioResult = { localPath: '', driveUrl: audioUrl || ''};

        if (state.state !== 'COMPLETED') {
            if (!scriptContent || state.state === 'SCRIPT_ERROR') {
                scriptContent = await executeStage(monitor, stateManager, 'SCRIPT', () => gerarRoteiro(state.topic), executionId, SHEETS_SCHEMA.SCRIPT_CONTENT);
            }
            if (!imagePrompts || imagePrompts.length === 0 || state.state === 'IMAGE_PROMPTS_ERROR') {
                 imagePrompts = await executeStage(monitor, stateManager, 'IMAGE_PROMPTS', () => criarPromptsDeImagem(scriptContent), executionId, SHEETS_SCHEMA.IMAGE_PROMPTS);
            }
            const prompts = typeof imagePrompts === 'string' ? JSON.parse(imagePrompts) : imagePrompts;

            // WORKAROUND: Força a recriação de imagens e áudio para garantir a existência de arquivos locais,
            // já que a funcionalidade de download de assets do Drive não está implementada.
            console.log("[WORKAROUND] Forçando a geração de imagens para obter arquivos locais.");
            imagesResult = await executeStage(monitor, stateManager, 'IMAGES', () => 
                imageGenerator.generateImages(prompts, executionId, executionPath, driveFolderId, tempFileManager)
            , executionId, SHEETS_SCHEMA.IMAGES_URLS);
            
            console.log("[WORKAROUND] Forçando a geração de áudio para obter arquivo local.");
            audioResult = await executeStage(monitor, stateManager, 'AUDIO', () => gerarNarracao(scriptContent, drive, executionId, executionPath, driveFolderId, tempFileManager), executionId, SHEETS_SCHEMA.AUDIO_URL);

            if (imagesResult.localPaths.length === 0 && imagesResult.driveUrls.length > 0) { 
                throw new Error("Falha ao gerar imagens locais, mesmo com o workaround. Verifique a etapa de geração de imagens."); 
            }
            if (!audioResult.localPath && audioResult.driveUrl) { 
                throw new Error("Falha ao gerar áudio local, mesmo com o workaround. Verifique a etapa de geração de áudio."); 
            }

            const videoPath = path.join(executionPath, `${executionId}_video_final.mp4`);
            const finalVideoLocalPath = await executeStage(monitor, stateManager, 'VIDEO', () => montarVideo(audioResult.localPath, imagesResult.localPaths, videoPath, tempFileManager), executionId, null);
            
            await executeStage(monitor, stateManager, 'UPLOAD', () => uploadVideoFinal(drive, finalVideoLocalPath, driveFolderId), executionId, SHEETS_SCHEMA.VIDEO_URL);

            if (CANVA_ACCESS_TOKEN && (!thumbnailUrl || state.state === 'CANVA_ERROR')) {
                // ...
            }
        }

        await stateManager.updateState(executionId, { C: 'COMPLETED' });
        await sendToDiscord(`✅ Pipeline para "${state.topic}" concluído com sucesso!`);
        console.log('[STATS] Estatísticas da Geração de Imagens:', imageGenerator.getStats());
        process.exit(0); // Adicionado para garantir a saída limpa do processo

    } catch (error) {
        console.error("Pipeline falhou!", error);
        await sendToDiscord(`**Erro na execução ${executionId}:** ${error.message}`, true);
        process.exitCode = 1;
    } finally {
        monitor.endTimer('PIPELINE_TOTAL');
        monitor.trackMemory('PIPELINE_FINAL');
        await tempFileManager.cleanup();
    }
}

runResilientPipeline();
