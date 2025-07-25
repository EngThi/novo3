require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const aiplatform = require('@google-cloud/aiplatform');
const { PredictionServiceClient } = aiplatform.v1;
const { helpers } = aiplatform;
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const util = require('util');


// --- Configuração ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_DRIVE_REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SHEET_NAME = process.env.GOOGLE_SHEET_NAME;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

const OAUTH_CLIENT_ID = '1060201687476-0c6m7fb4ttsmg84uibe6jh8utbmplr11.apps.googleusercontent.com';
const OAUTH_CLIENT_SECRET = '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';
const OAUTH_REDIRECT_URI = 'http://localhost:8080';

const PROJECT_ID = 'drive-uploader-466418';
const LOCATION = 'us-central1';
const PUBLISHER = 'google';
const MODEL = 'imagegeneration@005';
const OUTPUT_PATH = 'novo/output';

// --------------------

if (!GEMINI_API_KEY || !GOOGLE_DRIVE_REFRESH_TOKEN || !GOOGLE_SHEET_ID || !GOOGLE_SHEET_NAME || !DISCORD_WEBHOOK_URL) {
  console.error("Erro: Verifique se todas as variáveis de ambiente estão no arquivo .env.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const textModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest"});

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

async function findNextAvailableRow(sheets) {
    console.log("PLANILHA: Procurando proxima linha vazia...");
    const range = `'${GOOGLE_SHEET_NAME}'!A:A`;
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: range,
    });
    const numRows = response.data.values ? response.data.values.length : 0;
    const nextRow = numRows + 1;
    console.log(`PLANILHA: Proxima linha livre encontrada: ${nextRow}`);
    return nextRow;
}

async function updateSheet(sheets, range, values) {
    const fullRange = `'${GOOGLE_SHEET_NAME}'!${range}`;
    console.log(`PLANILHA: Atualizando celulas no range ${fullRange}...`);
    await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: fullRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: values,
        },
    });
}

async function descobrirConteudo(row, sheets) {
  console.log("ETAPA 1: Iniciando descoberta de conteudo...");
  const prompt = 'Sugira um tópico de vídeo sobre mistérios brasileiros que seja interessante e com potencial viral. Retorne apenas o título do tópico.';
  const result = await textModel.generateContent(prompt);
  const topic = result.response.text().trim();
  console.log(`ETAPA 1: Topico descoberto: ${topic}`);

  const ideaId = Date.now().toString();
  await updateSheet(sheets, `A${row}:C${row}`, [[topic, ideaId, 'Ideia Gerada']]);
  return { topic, ideaId };
}

async function gerarRoteiro(topic, row, sheets) {
  console.log(`ETAPA 2: Gerando roteiro para: "${topic}"...`);
  const prompt = `Crie um roteiro detalhado para um vídeo do YouTube com o título "${topic}". O roteiro deve ter cerca de 3 minutos, dividido em introdução, 3 seções principais e uma conclusão.`;
  const result = await textModel.generateContent(prompt);
  const script = result.response.text();
  console.log("ETAPA 2: Roteiro gerado com sucesso.");
  const filePath = path.join(OUTPUT_PATH, 'roteiro.txt');
  await fs.writeFile(filePath, script);
  console.log(`ETAPA 2: Roteiro salvo em '${filePath}'`);

  await updateSheet(sheets, `C${row}:E${row}`, [['Roteirizado', 'Vídeo', script]]);
  return script;
}

async function criarPromptsDeImagem(script, row, sheets) {
  console.log("ETAPA 3: Analisando roteiro para criar prompts de imagem...");
  const prompt = `Sua tarefa é analisar um roteiro de vídeo e gerar prompts para um modelo de imagem. Analise o roteiro dentro das tags <roteiro>${script}</roteiro>. Extraia 5 cenas visuais cruciais. Para cada cena, crie um prompt principal e um prompt negativo. - O prompt principal deve ser em inglês, detalhado e com estilo fotorrealista. - O prompt negativo deve listar elementos a serem evitados, como 'desenho, texto, logos, feio, deformado'. Sua resposta deve ser APENAS um array JSON contendo 5 objetos. Cada objeto deve ter as chaves "prompt" e "negativePrompt".`;
  const result = await textModel.generateContent(prompt);
  let jsonString = result.response.text().trim();

  // Remove a formatação de bloco de código da resposta da API
  jsonString = jsonString.replace(/```json/g, "").replace(/```/g, "");

  try {
    const prompts = JSON.parse(jsonString);
    console.log(`ETAPA 3: ${prompts.length} pares de prompt/negativePrompt criados.`);
    
    const promptsForSheet = prompts.map(p => `Prompt: ${p.prompt} | Negativo: ${p.negativePrompt}`).join('; ');
    await updateSheet(sheets, `K${row}`, [[promptsForSheet]]);
    return prompts;
  } catch (e) {
      console.error("Falha ao analisar o JSON da API. Resposta recebida:", jsonString);
      throw e;
  }
}

async function gerarImagens(prompts, vertexAiClient) {
  console.log("ETAPA 4: Gerando imagens com Vertex AI (Imagen)...");
  const imageDir = path.join(OUTPUT_PATH, 'images');
  await fs.mkdir(imageDir, { recursive: true });
  const endpoint = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/${PUBLISHER}/models/${MODEL}`;
  const imagePaths = [];
  for (let i = 0; i < prompts.length; i++) {
    const item = prompts[i];
    console.log(`ETAPA 4: Gerando imagem para o prompt: "${item.prompt.substring(0, 50)}..."`);
    
    const instance = helpers.toValue({ prompt: item.prompt });
    const parameters = helpers.toValue({ sampleCount: 1 });

    const request = {
      endpoint,
      instances: [instance],
      parameters: parameters,
    };

    try {
      const [response] = await vertexAiClient.predict(request);
      const imageBase64 = response.predictions[0].structValue.fields.bytesBase64Encoded.stringValue;
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const filePath = path.join(imageDir, `image_${i + 1}.png`);
      await fs.writeFile(filePath, imageBuffer);
      console.log(`ETAPA 4: Imagem salva em: ${filePath}`);
      imagePaths.push(filePath);
    } catch (error) {
      console.error(`ETAPA 4: Erro ao gerar imagem para o prompt ${i + 1}:`, error.details || error.message);
      // Adicionado: Ignorar erro de imagem e continuar
      if (error.details && error.details.includes("violates our policies")) {
          console.warn("ETAPA 4: Prompt de imagem violou politicas. Ignorando esta imagem e continuando.");
          continue; // Pula para o próximo prompt
      }
      // Se for outro tipo de erro, lançar exceção
      throw error;
    }
  }
  return imagePaths;
}

async function gerarNarracao(script, row, drive, sheets, textToSpeechClient) {
    console.log("ETAPA 5: Gerando narração com a biblioteca de cliente Text-to-Speech...");
    
    const request = {
        input: { text: script },
        voice: { languageCode: 'pt-BR', ssmlGender: 'FEMALE', name: 'pt-BR-Wavenet-B' },
        audioConfig: { audioEncoding: 'MP3' },
    };

    try {
        const [response] = await textToSpeechClient.synthesizeSpeech(request);
        const audioContent = response.audioContent;
        
        const audioFilePath = path.join(OUTPUT_PATH, 'narration.mp3');
        await fs.writeFile(audioFilePath, audioContent, 'binary');
        console.log(`ETAPA 5: Narração salva em: ${audioFilePath}`);

        console.log("ETAPA 5: Fazendo upload da narração para o Google Drive...");
        const file = await drive.files.create({
            requestBody: { name: 'narration.mp3' },
            media: { mimeType: 'audio/mpeg', body: require('fs').createReadStream(audioFilePath) },
        });
        const narrationUrl = `https://drive.google.com/file/d/${file.data.id}/view`;
        console.log(`ETAPA 5: Upload da narração concluído. URL: ${narrationUrl}`);

        await updateSheet(sheets, `F${row}`, [[narrationUrl]]);
        return audioFilePath;
    } catch (error) {
        console.error("ETAPA 5: Erro ao gerar narração:", error.message);
        throw error;
    }
}

async function montarVideo(narrationPath, imagePaths, outputPath) {
  console.log("ETAPA 6: Montando vídeo com FFmpeg...");

  return new Promise((resolve, reject) => {
    if (!imagePaths || imagePaths.length === 0) {
      return reject(new Error("Nenhuma imagem foi fornecida para a montagem do vídeo."));
    }

    ffmpeg.ffprobe(narrationPath, (err, metadata) => {
      if (err) {
        return reject(new Error(`Erro ao ler a duração do áudio: ${err.message}`));
      }
      const audioDuration = metadata.format.duration;
      const imageDuration = audioDuration / imagePaths.length;
      const crossFadeDuration = 1;

      const command = ffmpeg();

      imagePaths.forEach(imgPath => {
        command.addInput(imgPath).loop(imageDuration);
      });
      
      command.addInput(narrationPath);

      let filterComplex = '';
      imagePaths.forEach((_, i) => {
        filterComplex += `[${i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p[v${i}];`;
      });
      
      let lastOutputStream = 'v0';
      for (let i = 1; i < imagePaths.length; i++) {
        const nextOutputStream = `vout${i}`;
        const offset = i * imageDuration - (i * crossFadeDuration);
        filterComplex += `[${lastOutputStream}][v${i}]xfade=transition=fade:duration=${crossFadeDuration}:offset=${offset}[${nextOutputStream}];`;
        lastOutputStream = nextOutputStream;
      }

      command
        .complexFilter(filterComplex, lastOutputStream)
        .outputOptions(['-c:v libx264', '-c:a aac', '-shortest'])
        .on('end', () => {
          console.log(`ETAPA 6: Vídeo salvo em: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          reject(new Error(`Erro durante a montagem do vídeo: ${err.message}`));
        })
        .save(outputPath);
    });
  });
}

async function uploadParaDrive(filePath, row, drive, sheets) {
    console.log(`ETAPA 7: Fazendo upload do arquivo '${path.basename(filePath)}' para o Google Drive...`);
    const fileMimeType = path.extname(filePath) === '.mp4' ? 'video/mp4' : (path.extname(filePath) === '.txt' ? 'text/plain' : 'audio/mpeg');
    const file = await drive.files.create({
        requestBody: { name: path.basename(filePath) },
        media: { mimeType: fileMimeType, body: require('fs').createReadStream(filePath) },
    });
    const fileId = file.data.id;
    const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;
    console.log(`ETAPA 7: Upload concluido! URL: ${fileUrl}`);
    
    if (fileMimeType === 'video/mp4') {
        await updateSheet(sheets, `G${row}`, [[fileUrl]]);
    }

    return fileId;
}

// --- Função Principal ---
async function executarPipeline() {
  await sendToDiscord("Pipeline iniciado...", false);
  try {
    const oauth2Client = new google.auth.OAuth2(
      OAUTH_CLIENT_ID,
      OAUTH_CLIENT_SECRET,
      OAUTH_REDIRECT_URI
    );
    oauth2Client.setCredentials({ refresh_token: GOOGLE_DRIVE_REFRESH_TOKEN });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    const keyFilePath = 'novo/google-drive-credentials.json';
    const authIA = new GoogleAuth({
      keyFile: keyFilePath,
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });
    
    const vertexAiClient = new PredictionServiceClient({
      apiEndpoint: `${LOCATION}-aiplatform.googleapis.com`,
      auth: authIA
    });

    const textToSpeechClient = new TextToSpeechClient({ auth: authIA });
    
    await fs.mkdir(OUTPUT_PATH, { recursive: true });

    const currentRow = await findNextAvailableRow(sheets);

    const { topic } = await descobrirConteudo(currentRow, sheets);
    const script = await gerarRoteiro(topic, currentRow, sheets);
    const imagePrompts = await criarPromptsDeImagem(script, currentRow, sheets);
    const imagePaths = await gerarImagens(imagePrompts, vertexAiClient);
    
    // Verificamos se temos pelo menos 1 imagem antes de tentar gerar a narração
    if (imagePaths.length === 0) {
        throw new Error("Nenhuma imagem valida foi gerada. Nao e possivel continuar o pipeline.");
    }

    const narrationPath = await gerarNarracao(script, currentRow, drive, sheets, textToSpeechClient);
    
    const videoOutputPath = path.join(OUTPUT_PATH, 'video_final.mp4');
    const videoFinalPath = await montarVideo(narrationPath, imagePaths, videoOutputPath);
    
    await uploadParaDrive(videoFinalPath, currentRow, drive, sheets);
    
    await updateSheet(sheets, `C${currentRow}`, [['Concluído']]);

    const successMessage = `Pipeline concluído com sucesso. A planilha foi atualizada na linha ${currentRow}.`;
    await sendToDiscord(successMessage, false);

  } catch (error) {
    console.error("Pipeline falhou!", error.message || error);
    await sendToDiscord(`**Erro:** ${error.message}`, true);
    process.exit(1);
  }
}

executarPipeline();
