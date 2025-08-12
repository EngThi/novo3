// Configurações
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 segundos

// Limpa o log na instalação para um início limpo
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ 
    errorLog: [],
    downloadQueue: []
  });
  
  // Cria o diretório de downloads se não existir
  chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
    if (!downloadItem.filename.startsWith('whisk_downloads/')) {
      suggest({ filename: `whisk_downloads/${downloadItem.filename}` });
    } else {
      suggest();
    }
  });
});

// Função para fazer download de uma URL com retry
async function downloadWithRetry(url, filename, retryCount = 0) {
  try {
    console.log(`[Whisk Automation] Starting download: ${filename}`);
    
    // Verifica se o download já existe
    const downloads = await chrome.downloads.search({ filename: filename });
    if (downloads && downloads.length > 0) {
      console.log(`[Whisk Automation] File already exists: ${filename}`);
      return { success: true, skipped: true };
    }
    
    // Tenta fazer o download
    const downloadId = await new Promise((resolve, reject) => {
      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: false,
        conflictAction: 'uniquify'
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(downloadId);
        }
      });
    });
    
    // Aguarda o download ser concluído
    return new Promise((resolve) => {
      const onChanged = (delta) => {
        if (delta.id === downloadId && (delta.state && delta.state.current === 'complete' || delta.error)) {
          chrome.downloads.onChanged.removeListener(onChanged);
          
          if (delta.error) {
            console.error(`[Whisk Automation] Download failed: ${filename}`, delta.error);
            resolve({ success: false, error: delta.error });
          } else {
            console.log(`[Whisk Automation] Download completed: ${filename}`);
            resolve({ success: true });
          }
        }
      };
      
      chrome.downloads.onChanged.addListener(onChanged);
    });
  } catch (error) {
    console.error(`[Whisk Automation] Download error (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`[Whisk Automation] Retrying download (${retryCount + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return downloadWithRetry(url, filename, retryCount + 1);
    }
    
    return { 
      success: false, 
      error: error.message || 'Unknown error',
      url: url,
      filename: filename
    };
  }
}

// Processa a fila de downloads
async function processDownloadQueue() {
  const queueResult = await chrome.storage.local.get('downloadQueue');
  const queue = queueResult.downloadQueue || [];
  
  if (queue.length === 0) return;
  
  console.log(`[Whisk Automation] Processing download queue (${queue.length} items)`);
  
  // Pega o próximo item da fila
  const item = queue[0];
  const remainingItems = queue.slice(1);
  
  // Atualiza a fila
  await chrome.storage.local.set({ downloadQueue: remainingItems });
  
  // Processa o download
  const downloadResult = await downloadWithRetry(item.url, item.filename);
  
  if (!downloadResult.success && !downloadResult.skipped) {
    // Se falhou e não foi pulado, adiciona no final da fila para nova tentativa
    await chrome.storage.local.set({ 
      downloadQueue: [...remainingItems, item] 
    });
  }
  
  // Processa o próximo item após um pequeno atraso
  setTimeout(processDownloadQueue, 1000);
}

// Inicia o processamento da fila quando a extensão é carregada
processDownloadQueue();

// Listener para mensagens
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.action === 'downloadImages') {
        console.log(`[Whisk Automation] Received ${message.urls.length} URLs to download`);
        
        // Cria os itens da fila de download
        const downloadItems = message.urls.map((url, index) => {
          const safePrompt = message.prompt.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
          const timestamp = new Date().getTime();
          const filename = `whisk_downloads/${safePrompt}_${timestamp}_${index + 1}.png`;
          
          return {
            url: url,
            filename: filename,
            prompt: message.prompt,
            timestamp: timestamp
          };
        });
        
        // Adiciona à fila de downloads
        const result = await chrome.storage.local.get('downloadQueue');
        const currentQueue = result.downloadQueue || [];
        const newQueue = [...currentQueue, ...downloadItems];
        
        await chrome.storage.local.set({ downloadQueue: newQueue });
        console.log(`[Whisk Automation] Added ${downloadItems.length} items to download queue`);
        
        // Inicia o processamento se não estiver rodando
        if (currentQueue.length === 0) {
          processDownloadQueue();
        }
        
        sendResponse({ success: true, queued: downloadItems.length });
        
      } else if (message.type === 'logError') {
        console.error('[Whisk Automation] Error:', message.error);
        
        // Adiciona o erro ao log
        const result = await chrome.storage.local.get('errorLog');
        const errorLog = result.errorLog || [];
        
        errorLog.push({
          timestamp: new Date().toISOString(),
          error: message.error,
          stack: message.stack,
          url: window.location.href
        });
        
        await chrome.storage.local.set({ errorLog: errorLog.slice(-100) }); // Mantém apenas os 100 erros mais recentes
        
        sendResponse({ success: true });
      }
    } catch (error) {
      console.error('[Whisk Automation] Error in message handler:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  return true; // Mantém a porta de mensagem aberta para respostas assíncronas
});

// Limpa a fila de downloads quando o navegador é fechado
chrome.runtime.onSuspend.addListener(() => {
  chrome.storage.local.set({ downloadQueue: [] });
});
