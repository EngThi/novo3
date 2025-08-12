document.addEventListener('DOMContentLoaded', () => {
  const promptsTextarea = document.getElementById('prompts');
  const startButton = document.getElementById('startButton');
  const stopButton = document.getElementById('stopButton');
  const pastePromptsButton = document.getElementById('pastePromptsButton');
  const copyPixButton = document.getElementById('copyPixButton');
  const statusDiv = document.getElementById('status');
  const progressBar = document.getElementById('progressBar');
  const progress = document.getElementById('progress');
  const promptCountFeedback = document.getElementById('promptCountFeedback');

  // Função para verificar se estamos na aba correta
  const checkCurrentTab = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('labs.google/fx/pt/tools/whisk')) {
        startButton.disabled = false;
        statusDiv.textContent = 'Pronto para começar.';
        statusDiv.classList.remove('completed');
      } else {
        startButton.disabled = true;
        statusDiv.textContent = 'Por favor, navegue até a página do Whisk para usar a extensão.';
        statusDiv.classList.remove('completed');
      }
    } catch (error) {
      statusDiv.textContent = 'Erro ao verificar a aba.';
      console.error('Tab check error:', error);
    }
  };

  // Atualiza o feedback da contagem de prompts
  const updatePromptCount = () => {
    const prompts = promptsTextarea.value.split('\n').map(p => p.trim()).filter(p => p);
    if (prompts.length > 0) {
      promptCountFeedback.textContent = `Pronto para gerar: ${prompts.length} imagens`;
    } else {
      promptCountFeedback.textContent = '0 prompts inseridos';
    }
  };

  // Inicialização
  checkCurrentTab();
  updatePromptCount();

  // Event listener para o textarea para atualizar a contagem
  promptsTextarea.addEventListener('input', updatePromptCount);

  // Iniciar a automação
  startButton.addEventListener('click', async () => {
    const prompts = promptsTextarea.value.split('\n').map(p => p.trim()).filter(p => p);
    if (prompts.length === 0) {
      statusDiv.textContent = 'Por favor, insira pelo menos um prompt.';
      return;
    }

    startButton.disabled = true;
    stopButton.disabled = false;
    promptsTextarea.disabled = true;
    progressBar.style.display = 'block';
    progress.style.width = '0%';
    statusDiv.classList.remove('completed');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Injeta o content script programaticamente
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      // Envia a mensagem para iniciar a automação APÓS a injeção do script
      chrome.tabs.sendMessage(tab.id, { action: 'startAutomation', prompts });

    } catch (error) {
      statusDiv.textContent = 'Erro ao iniciar a automação. Verifique o console para mais detalhes.';
      console.error('Automation start error:', error);
      startButton.disabled = false;
      stopButton.disabled = true;
      promptsTextarea.disabled = false;
      progressBar.style.display = 'none';
    }
  });

  // Interromper a automação
  stopButton.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'stopAutomation' });
    startButton.disabled = false;
    stopButton.disabled = true;
    promptsTextarea.disabled = false;
    statusDiv.textContent = 'Automação interrompida.';
    progressBar.style.display = 'none';
    statusDiv.classList.remove('completed');
  });

  // Colar prompts da área de transferência
  pastePromptsButton.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      promptsTextarea.value = text;
      updatePromptCount(); // Atualiza a contagem após colar
      statusDiv.textContent = 'Prompts colados da área de transferência.';
      statusDiv.classList.remove('completed');
    } catch (err) {
      statusDiv.textContent = 'Erro ao colar prompts. Permissão negada ou área de transferência vazia.';
      console.error('Failed to read clipboard contents: ', err);
    }
  });

  // Copiar chave PIX
  copyPixButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('toriotools@gmail.com');
      statusDiv.textContent = 'Chave PIX copiada!';
      statusDiv.classList.remove('completed');
    } catch (err) {
      statusDiv.textContent = 'Erro ao copiar a chave PIX.';
      console.error('Failed to copy PIX key: ', err);
    }
  });

  // Listener para mensagens do content script (status)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'status') {
      statusDiv.textContent = message.text;
      if (message.progress) {
        const percentage = (message.progress.current / message.progress.total) * 100;
        progress.style.width = `${percentage}%`;
      }
      if (message.done) {
        startButton.disabled = false;
        stopButton.disabled = true;
        promptsTextarea.disabled = false;
        progressBar.style.display = 'none';
        statusDiv.textContent = 'Concluído!';
        statusDiv.classList.add('completed'); // Adiciona classe para feedback de conclusão
      }
    }
  });
});