export async function logError(error) {
  try {
    const { errorLog = [] } = await chrome.storage.local.get('errorLog');
    const timestamp = new Date().toISOString();
    const errorMessage = error.stack || error.message || String(error);
    errorLog.unshift(`[${timestamp}] ${errorMessage}`);
    await chrome.storage.local.set({ errorLog: errorLog.slice(0, 100) });
    // Notifica o popup para atualizar a visualização do log
    chrome.runtime.sendMessage({ type: 'logUpdated' }).catch(() => {});
  } catch (e) {
    console.error('Falha crítica ao salvar o log:', e);
  }
}
