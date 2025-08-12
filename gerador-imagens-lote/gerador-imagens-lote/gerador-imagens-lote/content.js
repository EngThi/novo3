console.log('[Whisk Automation] Content script loaded.');

// --- Funções Utilitárias ---

// Espera por um elemento aparecer no DOM
function waitForElement(selector, timeout = 120000) {
  console.log(`[Whisk Automation] Waiting for element: ${selector}`);
  return new Promise((resolve, reject) => {
    let interval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(interval);
        console.log(`[Whisk Automation] Element found: ${selector}`);
        resolve(element);
      }
    }, 500); // Verifica a cada 500ms

    setTimeout(() => {
      clearInterval(interval);
      console.error(`[Whisk Automation] Timeout waiting for element: ${selector}`);
      reject(new Error(`Elemento não encontrado: ${selector}`));
    }, timeout);
  });
}

// Espera por múltiplos elementos aparecerem no DOM e estabilizarem, verificando a completude da imagem
function waitForAllElements(selector, timeout = 120000) {
  console.log(`[Whisk Automation] Waiting for all elements to stabilize and complete: ${selector}`);
  return new Promise((resolve, reject) => {
    let lastImageUrls = '';
    let stableCount = 0;
    const stabilityThreshold = 3; // Número de verificações onde a contagem de URLs permanece a mesma
    let interval = setInterval(() => {
      const elements = document.querySelectorAll(selector);
      const currentImageUrls = Array.from(elements)
        .filter(img => img.complete) // Filtra apenas imagens completamente carregadas
        .map(img => img.src)
        .sort()
        .join('|');

      if (currentImageUrls.length > 0 && currentImageUrls === lastImageUrls) {
        stableCount++;
      } else {
        stableCount = 0;
      }

      lastImageUrls = currentImageUrls;

      if (stableCount >= stabilityThreshold) {
        clearInterval(interval);
        console.log(`[Whisk Automation] Image URLs stabilized and complete at ${elements.length} for selector: ${selector}`);
        resolve(Array.from(elements).filter(img => img.complete)); // Retorna apenas as imagens completas
      }
    }, 1000); // Verifica a cada 1 segundo

    setTimeout(() => {
      clearInterval(interval);
      console.error(`[Whisk Automation] Timeout waiting for elements to stabilize and complete: ${selector}`);
      reject(new Error(`Timeout esperando por elementos para estabilizar e completar: ${selector}`));
    }, timeout);
  });
}

// Simula um clique de usuário de forma mais robusta
function simulateClick(element) {
  console.log('[Whisk Automation] Simulating click on element.');
  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  console.log('[Whisk Automation] Click events dispatched.');
}

// Envia uma mensagem de status para o popup
function updateStatus(text, progress = null, done = false) {
  chrome.runtime.sendMessage({ type: 'status', text, progress, done });
}

// Envia um erro para o background script para ser logado
function logError(error) {
  console.error('[Whisk Automation] Error:', error);
  chrome.runtime.sendMessage({ type: 'logError', error: error.stack || error.message });
}

// --- Lógica Principal da Automação ---

class WhiskAutomation {
  constructor() {
    this.isRunning = false;
    this.prompts = [];
    this.currentIndex = 0;
    this.downloadedImageUrls = new Set(); // Para rastrear URLs já baixadas
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 segundos entre tentativas
    
    // Carrega URLs já baixadas do armazenamento
    this.loadDownloadedUrls();
  }
  
  // Carrega URLs já baixadas do armazenamento
  async loadDownloadedUrls() {
    try {
      const result = await chrome.storage.local.get('downloadedImageUrls');
      if (result.downloadedImageUrls) {
        this.downloadedImageUrls = new Set(result.downloadedImageUrls);
        console.log(`[Whisk Automation] Loaded ${this.downloadedImageUrls.size} previously downloaded URLs`);
      }
    } catch (error) {
      console.error('[Whisk Automation] Error loading downloaded URLs:', error);
    }
  }
  
  // Salva as URLs baixadas no armazenamento
  async saveDownloadedUrl(url) {
    this.downloadedImageUrls.add(url);
    try {
      await chrome.storage.local.set({ 
        downloadedImageUrls: Array.from(this.downloadedImageUrls) 
      });
    } catch (error) {
      console.error('[Whisk Automation] Error saving downloaded URLs:', error);
    }
  }

  async start(prompts) {
    if (this.isRunning) {
      console.log('[Whisk Automation] Automation already running.');
      return;
    }
    this.prompts = prompts;
    this.currentIndex = 0;
    this.isRunning = true;
    this.downloadedImageUrls.clear(); // Limpa URLs baixadas a cada nova automação
    console.log('[Whisk Automation] Starting automation with prompts:', prompts);
    this.processNextPrompt();
  }

  stop() {
    this.isRunning = false;
    updateStatus('Automação interrompida.', null, true);
    console.log('[Whisk Automation] Automation stopped.');
  }

  async processNextPrompt(retryCount = 0) {
    if (!this.isRunning) return;
    
    if (this.currentIndex >= this.prompts.length) {
      this.isRunning = false;
      updateStatus('Processo concluído!', null, true);
      console.log('[Whisk Automation] Automation finished.');
      return;
    }

    const prompt = this.prompts[this.currentIndex];
    updateStatus(`Processando prompt ${this.currentIndex + 1}/${this.prompts.length}: ${prompt}`, { current: this.currentIndex + 1, total: this.prompts.length });
    console.log(`[Whisk Automation] Processing prompt: ${prompt}`);

    try {
      try {
        // 1. Preencher o campo de prompt com colagem direta
        const promptInput = await waitForElement('textarea[placeholder*="Descreva sua ideia"]');
        
        // Limpa o campo e cola o texto diretamente
        promptInput.value = '';
        promptInput.focus();
        document.execCommand('insertText', false, prompt);
        
        // Dispara eventos para garantir que o Whisk detecte a mudança
        promptInput.dispatchEvent(new Event('input', { bubbles: true }));
        promptInput.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('[Whisk Automation] Prompt pasted directly.');

        // 2. Simular pressionar ENTER para acionar a geração
        promptInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        promptInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        console.log('[Whisk Automation] Enter key simulated.');

        // 3. Aguardar um pouco para a geração começar
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 4. Esperar que as imagens apareçam e coletar suas URLs
        const maxAttempts = 10; // Número máximo de tentativas
        let attempts = 0;
        let imageElements = [];
        let newImageUrls = [];

        while (attempts < maxAttempts && newImageUrls.length === 0) {
          attempts++;
          console.log(`[Whisk Automation] Attempt ${attempts} to find new images...`);
          
          // Aguardar um pouco entre as tentativas
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Procurar por elementos de imagem
          imageElements = await waitForAllElements('img[src^="blob:https://labs.google/"]', 10000);
          
          // Filtrar apenas as novas imagens que ainda não foram baixadas
          newImageUrls = imageElements
            .map(img => img.src)
            .filter(url => !this.downloadedImageUrls.has(url));
            
          console.log(`[Whisk Automation] Found ${newImageUrls.length} new images in attempt ${attempts}`);
          
          if (newImageUrls.length === 0) {
            // Rolar para baixo para garantir que todas as imagens são carregadas
            window.scrollBy(0, 500);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        if (newImageUrls.length > 0) {
          console.log(`[Whisk Automation] Found ${newImageUrls.length} new unique image URLs to download.`);
          
          // 5. Enviar URLs para o background script para download
          const downloadPromises = newImageUrls.map(url => 
            new Promise((resolve) => {
              chrome.runtime.sendMessage({ 
                action: 'downloadImages', 
                urls: [url], // Envia uma URL por vez para melhor rastreamento
                prompt: prompt 
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error('[Whisk Automation] Error sending message:', chrome.runtime.lastError);
                  resolve(false);
                } else {
                  resolve(true);
                }
              });
            })
          );
          
          // Aguardar todos os downloads serem iniciados
          const results = await Promise.all(downloadPromises);
          const successCount = results.filter(success => success).length;
          
          // Salvar as URLs baixadas
          for (const url of newImageUrls) {
            await this.saveDownloadedUrl(url);
          }
          
          console.log(`[Whisk Automation] Successfully initiated download for ${successCount} of ${newImageUrls.length} images.`);
          
          if (successCount < newImageUrls.length && retryCount < this.maxRetries) {
            console.log(`[Whisk Automation] Retrying failed downloads (attempt ${retryCount + 1} of ${this.maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            return this.processNextPrompt(retryCount + 1);
          }
        } else {
          console.warn('[Whisk Automation] No new image URLs found to download after multiple attempts.');
          updateStatus(`Nenhuma nova imagem encontrada para o prompt ${this.currentIndex + 1}/${this.prompts.length}`, 
                      { current: this.currentIndex + 1, total: this.prompts.length });
        }

      } catch (error) {
        console.error(`[Whisk Automation] Error in prompt processing (attempt ${retryCount + 1}):`, error);
        
        if (retryCount < this.maxRetries) {
          console.log(`[Whisk Automation] Retrying (attempt ${retryCount + 1} of ${this.maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retryCount + 1)));
          return this.processNextPrompt(retryCount + 1);
        } else {
          throw error; // Propaga o erro se todas as tentativas falharem
        }
      }
      
      // Mover para o próximo prompt
      this.currentIndex++;
      if (this.isRunning) {
        // Pequena pausa antes do próximo prompt
        await new Promise(resolve => setTimeout(resolve, 2000));
        this.processNextPrompt();
      }

    } catch (error) {
      logError(error);
      updateStatus(`Erro ao processar o prompt: ${error.message}`, null, true);
      this.isRunning = false;
      console.error('[Whisk Automation] Error during prompt processing:', error);
    }
  }
}

const automation = new WhiskAutomation();

// Listener para iniciar ou parar a automação
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'startAutomation') {
    automation.start(message.prompts);
  } else if (message.action === 'stopAutomation') {
    automation.stop();
  }
});