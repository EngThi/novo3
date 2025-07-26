require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const aiplatform = require('@google-cloud/aiplatform');
const { PredictionServiceClient } = aiplatform.v1;
const { helpers } = aiplatform;
const texttospeech = require('@google-cloud/text-to-speech');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const PipelineStateManager = require('./stateManager');

// --- Configuração ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_DRIVE_REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SHEET_NAME = "T";
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const OAUTH_CLIENT_ID = '1060201687476-0c6m7fb4ttsmg84uibe6jh8utbmplr11.apps.googleusercontent.com';
const OAUTH_CLIENT_SECRET = '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';
const OAUTH_REDIRECT_URI = 'http://localhost:8080';
const PROJECT_ID = 'drive-uploader-466418';
const LOCATION = 'us-central1';
const PUBLISHER = 'google';
const MODEL = 'imagegeneration@005';
const BASE_OUTPUT_PATH = 'novo/output';

const SHEETS_SCHEMA = {
  ID: 'A', TOPIC: 'B', CURRENT_STATE: 'C', LAST_UPDATED: 'D',
  SCRIPT_CONTENT: 'E', IMAGE_PROMPTS: 'F', IMAGES_URLS: 'G',
  AUDIO_URL: 'H', VIDEO_URL: 'I', ERROR_LOG: 'J',
  RETRY_COUNT: 'K', PROCESSING_METADATA: 'L'
};

// --- Funções Auxiliares ---
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
function chunkTextByBytes(text, maxBytes = 4500) {
    const chunks = [];
    let currentChunk = '';
    const sentences = text.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
        const sentenceBytes = Buffer.byteLength(sentence, 'utf8');
        const currentBytes = Buffer.byteLength(currentChunk, 'utf8');
        if (currentBytes + sentenceBytes + 1 <= maxBytes) {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        } else {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = (sentenceBytes > maxBytes) ? '' : sentence;
            if (sentenceBytes > maxBytes) {
                const words = sentence.split(' ');
                for (const word of words) {
                    const wordBytes = Buffer.byteLength(word, 'utf8');
                    const currentWordBytes = Buffer.byteLength(currentChunk, 'utf8');
                    if (currentWordBytes + wordBytes + 1 <= maxBytes) {
                        currentChunk += (currentChunk ? ' ' : '') + word;
                    } else {
                        if (currentChunk) chunks.push(currentChunk.trim());
                        currentChunk = word;
                    }
                }
            }
        }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
}
async function sendToDiscord(message, isError = false) {
    const embed = {
        title: isError ? '❌ Pipeline Falhou!' : '✅ Pipeline Concluído!',
        description: message,
        color: isError ? 15158332 : 3066993,
        timestamp: new Date().toISOString()
    };
    if (isError) {
        embed.title = '❌ Pipeline Falhou!';
        embed.color = 15158332;
    } else if (message.includes("iniciado")) {
        embed.title = '🚀 Pipeline Iniciado!';
        embed.color = 3447003;
    }
    try {
        await axios.post(DISCORD_WEBHOOK_URL, { embeds: [embed] });
    } catch (error) {
        console.error("Erro ao enviar notificação para o Discord:", error.message);
    }
}
async function getOrCreateDriveFolder(drive, folderName) {
    const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
    const response = await drive.files.list({ q: query, fields: 'files(id)' });
    if (response.data.files.length > 0) {
        return response.data.files[0].id;
    } else {
        const fileMetadata = { name: folderName, mimeType: 'application/vnd.google-apps.folder' };
        const folder = await drive.files.create({ resource: fileMetadata, fields: 'id' });
        return folder.data.id;
    }
}
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.png': return 'image/png';
        case '.mp3': return 'audio/mpeg';
        case '.mp4': return 'video/mp4';
        default: return 'application/octet-stream';
    }
}
async function uploadToDrive(drive, filePath, folderId) {
    const mimeType = getMimeType(filePath);
    const fileMetadata = { name: path.basename(filePath), parents: [folderId] };
    const media = { mimeType: mimeType, body: fssync.createReadStream(filePath) };
    const file = await drive.files.create({ resource: fileMetadata, media: media, fields: 'id, webViewLink' });
    await drive.permissions.create({ fileId: file.data.id, requestBody: { role: 'reader', type: 'anyone' } });
    return file.data.webViewLink;
}

// --- Funções do Pipeline ---
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
    const prompt = `Sua tarefa é analisar um roteiro de vídeo e gerar prompts para um modelo de imagem. Analise o roteiro dentro das tags <roteiro>${script}</roteiro>. Extraia 5 cenas visuais cruciais. Para cada cena, crie um prompt principal e um prompt negativo. - O prompt principal deve ser em inglês, detalhado, com estilo fotorrealista e **seguro para todos os públicos (safe for work)**. Evite gerar imagens de pessoas ou tópicos controversos. - O prompt negativo deve listar elementos a serem evitados, como 'desenho, texto, logos, feio, deformado'. Sua resposta deve ser APENAS um array JSON contendo 5 objetos. Cada objeto deve ter as chaves "prompt" e "negativePrompt".`;
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest"});
    const result = await model.generateContent(prompt);
    let jsonString = result.response.text().trim().replace(/```json/g, "").replace(/```/g, "");
    return JSON.parse(jsonString);
}
async function gerarImagens(prompts, vertexAiClient, drive, executionId, executionPath, driveFolderId) {
    console.log("ETAPA 4: Gerando e fazendo upload das imagens...");
    const imageDir = path.join(executionPath, 'images');
    await fs.mkdir(imageDir, { recursive: true });
    const endpoint = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/${PUBLISHER}/models/${MODEL}`;
    const localPaths = [];
    const driveUrls = [];
    for (let i = 0; i < prompts.length; i++) {
        const request = { endpoint, instances: [helpers.toValue({ prompt: prompts[i].prompt })], parameters: helpers.toValue({ sampleCount: 1 }) };
        const [response] = await vertexAiClient.predict(request);
        const imageBase64 = response.predictions[0].structValue.fields.bytesBase64Encoded.stringValue;
        const filePath = path.join(imageDir, `${executionId}_image_${i + 1}.png`);
        await fs.writeFile(filePath, Buffer.from(imageBase64, 'base64'));
        localPaths.push(filePath);
        const driveUrl = await uploadToDrive(drive, filePath, driveFolderId);
        driveUrls.push(driveUrl);
    }
    return { localPaths, driveUrls };
}
async function gerarNarracao(script, drive, executionId, executionPath, driveFolderId) {
    console.log("ETAPA 5: Gerando e fazendo upload da narração...");
    const client = new texttospeech.TextToSpeechClient({ keyFilename: 'novo/google-drive-credentials.json' });
    const chunks = chunkTextByBytes(script);
    const audioBuffers = [];
    for (const chunk of chunks) {
        const request = { input: { text: chunk }, voice: { languageCode: 'pt-BR', name: 'pt-BR-Neural2-A' }, audioConfig: { audioEncoding: 'MP3' } };
        const [response] = await client.synthesizeSpeech(request);
        audioBuffers.push(response.audioContent);
    }
    const localPath = path.join(executionPath, `${executionId}_narration.mp3`);
    fssync.writeFileSync(localPath, Buffer.concat(audioBuffers));
    const driveUrl = await uploadToDrive(drive, localPath, driveFolderId);
    return { localPath, driveUrl };
}
async function montarVideo(narrationPath, imagePaths, outputPath) {
    console.log("ETAPA 6: Montando vídeo...");
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(narrationPath, (err, metadata) => {
            if (err) return reject(new Error(`Erro no ffprobe: ${err.message}`));
            const audioDuration = metadata.format.duration;
            const imageDuration = audioDuration / imagePaths.length;
            const command = ffmpeg();
            imagePaths.forEach(p => command.input(p).inputOptions(`-t ${imageDuration + 1}`));
            command.addInput(narrationPath);
            let filterComplex = '';
            imagePaths.forEach((_, i) => {
                filterComplex += `[${i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1:color=black,setsar=1,format=yuv420p,zoompan=z='min(zoom+0.001,1.1)':d=${Math.ceil(imageDuration * 25)}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080[v${i}];`;
            });
            let lastStream = 'v0';
            for (let i = 1; i < imagePaths.length; i++) {
                filterComplex += `[${lastStream}][v${i}]xfade=transition=fade:duration=1:offset=${i * imageDuration}[vout${i}];`;
                lastStream = `vout${i}`;
            }
            command.complexFilter(filterComplex, lastStream)
                .outputOptions(['-c:v libx264', '-r 25', '-c:a aac', '-pix_fmt yuv420p', '-shortest'])
                .on('end', () => resolve(outputPath))
                .on('error', (e) => reject(new Error(`Erro no ffmpeg: ${e.message}`)))
                .save(outputPath);
        });
    });
}
async function uploadVideoFinal(drive, filePath, folderId) {
    console.log("ETAPA 7: Fazendo upload do vídeo final para o Drive...");
    return await uploadToDrive(drive, filePath, folderId);
}
// --- Orquestrador de Etapa ---
async function executeStage(stateManager, stageName, stageFunction, executionId, outputColumn) {
    try {
        await stateManager.updateState(executionId, `${stageName}_RUNNING`);
        const result = await retryWithBackoff(() => stageFunction());
        const dataToUpdate = { C: `${stageName}_COMPLETE` };
        if (outputColumn) {
            let dataForSheet;
            if (result && (result.driveUrl || result.driveUrls)) {
                 dataForSheet = result.driveUrl || result.driveUrls;
            } else {
                 dataForSheet = result;
            }
            dataToUpdate[outputColumn] = typeof dataForSheet === 'string' ? dataForSheet : JSON.stringify(dataForSheet);
        }
        await stateManager.updateState(executionId, `${stageName}_COMPLETE`, dataToUpdate);
        return result;
    } catch (error) {
        await stateManager.updateState(executionId, `${stageName}_ERROR`, { [SHEETS_SCHEMA.ERROR_LOG]: error.message });
        throw error;
    }
}
// --- Pipeline Principal ---
async function runResilientPipeline(executionId = null) {
    const oauth2Client = new google.auth.OAuth2(OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REDIRECT_URI);
    oauth2Client.setCredentials({ refresh_token: GOOGLE_DRIVE_REFRESH_TOKEN });
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const keyFilePath = 'novo/google-drive-credentials.json';
    const authIA = new GoogleAuth({ keyFile: keyFilePath, scopes: 'https://www.googleapis.com/auth/cloud-platform' });
    const vertexAiClient = new PredictionServiceClient({ apiEndpoint: `${LOCATION}-aiplatform.googleapis.com`, auth: authIA });
    const stateManager = new PipelineStateManager(sheets, GOOGLE_SHEET_ID, GOOGLE_SHEET_NAME);

    try {
        if (!executionId) {
            const topic = await descobrirConteudo();
            executionId = await stateManager.createExecution(topic);
        }
        
        let state = await stateManager.getExecutionState(executionId);
        if (!state) throw new Error(`Estado não encontrado para ${executionId}`);
        
        const executionPath = path.join(BASE_OUTPUT_PATH, executionId);
        await fs.mkdir(executionPath, { recursive: true });
        
        const driveFolderId = await getOrCreateDriveFolder(drive, executionId);

        let { scriptContent, imagePrompts, imagesUrls, audioUrl } = state;
        let imagesResult, audioResult;

        if (state.state !== 'COMPLETED') {
            if (!scriptContent || state.state === 'SCRIPT_ERROR') {
                scriptContent = await executeStage(stateManager, 'SCRIPT', () => gerarRoteiro(state.topic), executionId, SHEETS_SCHEMA.SCRIPT_CONTENT);
            }
            if (!imagePrompts || state.state === 'IMAGE_PROMPTS_ERROR') {
                 imagePrompts = await executeStage(stateManager, 'IMAGE_PROMPTS', () => criarPromptsDeImagem(scriptContent), executionId, SHEETS_SCHEMA.IMAGE_PROMPTS);
            }
            const prompts = typeof imagePrompts === 'string' ? JSON.parse(imagePrompts) : imagePrompts;

            if (imagesUrls.length === 0 || state.state === 'IMAGES_ERROR') {
                imagesResult = await executeStage(stateManager, 'IMAGES', () => gerarImagens(prompts, vertexAiClient, drive, executionId, executionPath, driveFolderId), executionId, SHEETS_SCHEMA.IMAGES_URLS);
            } else {
                 imagesResult = { localPaths: [], driveUrls: imagesUrls };
            }
            if (!audioUrl || state.state === 'AUDIO_ERROR') {
                 audioResult = await executeStage(stateManager, 'AUDIO', () => gerarNarracao(scriptContent, drive, executionId, executionPath, driveFolderId), executionId, SHEETS_SCHEMA.AUDIO_URL);
            } else {
                const audioFilePath = path.join(executionPath, `${executionId}_narration.mp3`);
                console.warn(`Áudio já existe no Drive. A lógica de download precisa ser implementada para ${audioUrl} -> ${audioFilePath}`);
                audioResult = await executeStage(stateManager, 'AUDIO', () => gerarNarracao(scriptContent, drive, executionId, executionPath, driveFolderId), executionId, SHEETS_SCHEMA.AUDIO_URL);
            }
            
            if (imagesResult.localPaths.length === 0 && imagesResult.driveUrls.length > 0) {
                console.warn("Imagens já existem no Drive. A lógica de download precisa ser implementada.");
                imagesResult = await executeStage(stateManager, 'IMAGES', () => gerarImagens(prompts, vertexAiClient, drive, executionId, executionPath, driveFolderId), executionId, SHEETS_SCHEMA.IMAGES_URLS);
            }

            const videoPath = path.join(executionPath, `${executionId}_video_final.mp4`);
            const finalVideoLocalPath = await executeStage(stateManager, 'VIDEO', () => montarVideo(audioResult.localPath, imagesResult.localPaths, videoPath), executionId, null);
            
            await executeStage(stateManager, 'UPLOAD', () => uploadVideoFinal(drive, finalVideoLocalPath, driveFolderId), executionId, SHEETS_SCHEMA.VIDEO_URL);
        }

        await sendToDiscord(`✅ Pipeline para "${state.topic}" concluído com sucesso!`, false);

    } catch (error) {
        console.error("Pipeline falhou!", error.message);
        await sendToDiscord(`**Erro na execução ${executionId}:** ${error.message}`, true);
        process.exit(1);
    }
}

runResilientPipeline('exec_1753539886160');
