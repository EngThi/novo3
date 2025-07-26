class PipelineStateManager {
  constructor(sheetsService, spreadsheetId, sheetName = 'Sheet1') {
    this.sheets = sheetsService;
    this.spreadsheetId = spreadsheetId;
    this.sheetName = sheetName;
  }

  async createExecution(topic) {
    const executionId = `exec_${Date.now()}`;
    const row = [
      executionId,
      topic,
      'PENDING',
      new Date().toISOString(),
      '', '[]', '', '', '', 0, '{}' // Inicializa image_urls como '[]'
    ];
    
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!A:K`,
      valueInputOption: 'RAW',
      resource: { values: [row] }
    });
    
    return executionId;
  }

  async updateState(executionId, newState, data = {}) {
    const rowIndex = await this.findRowByExecutionId(executionId);
    if (rowIndex === -1) {
        throw new Error(`Execution ID ${executionId} not found.`);
    }

    const updates = {
      C: newState,
      D: new Date().toISOString(),
      ...data
    };
    
    const rangeUpdates = Object.keys(updates).map(col => ({
        range: `${this.sheetName}!${col}${rowIndex}`,
        values: [[updates[col]]]
    }));

    await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
            valueInputOption: 'RAW',
            data: rangeUpdates
        }
    });
  }

  async getExecutionState(executionId) {
    const rowIndex = await this.findRowByExecutionId(executionId);
    if (rowIndex === -1) {
        return null;
    }
    const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A${rowIndex}:K${rowIndex}`,
    });

    if (!response.data.values) return null;

    const row = response.data.values[0];
    return {
        id: row[0],
        topic: row[1],
        state: row[2],
        lastUpdated: row[3],
        scriptContent: row[4],
        // Analisa o JSON de URLs de imagem, com fallback para array vazio
        imagesUrls: row[5] ? JSON.parse(row[5]) : [],
        audioUrl: row[6],
        videoUrl: row[7],
        errorLog: row[8],
        retryCount: row[9],
        processingMetadata: row[10],
    };
  }

  async findRowByExecutionId(executionId) {
    const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:A`,
    });
    const ids = response.data.values;
    if (!ids) {
        return -1;
    }
    for (let i = 0; i < ids.length; i++) {
        if (ids[i][0] === executionId) {
            return i + 1; // 1-based index
        }
    }
    return -1;
  }
}

module.exports = PipelineStateManager;
