// novo/stateManager.js
const { google } = require('googleapis');

class PipelineStateManager {
  constructor(sheetsService, spreadsheetId, sheetName = 'Sheet1') {
    this.sheets = sheetsService;
    this.spreadsheetId = spreadsheetId;
    this.sheetName = sheetName;
  }

  async createExecution(topic) {
    const executionId = `exec_${Date.now()}`;
    const row = [[
      executionId, topic, 'PENDING', new Date().toISOString(),
      '', '[]', '[]', '', '', '', 0, '{}'
    ]];
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: row }
    });
    return executionId;
  }

  async updateState(executionId, data) {
    const rowIndex = await this.findRowByExecutionId(executionId);
    if (rowIndex === -1) {
      throw new Error(`Execution ID ${executionId} not found.`);
    }

    // Garante que o timestamp seja sempre atualizado
    data['D'] = new Date().toISOString();
    
    const dataForUpdate = Object.keys(data).map(col => ({
      range: `${this.sheetName}!${col}${rowIndex}`,
      values: [[data[col]]]
    }));

    await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      resource: {
        valueInputOption: 'USER_ENTERED',
        data: dataForUpdate,
      }
    });
  }

  async getExecutionState(executionId) {
    const rowIndex = await this.findRowByExecutionId(executionId);
    if (rowIndex === -1) return null;

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!A${rowIndex}:M${rowIndex}`,
    });

    if (!response.data.values) return null;
    const row = response.data.values[0] || [];
    
    return {
      id: row[0], topic: row[1], state: row[2],
      scriptContent: row[4],
      imagePrompts: row[5] ? JSON.parse(row[5]) : [],
      imagesUrls: row[6] ? JSON.parse(row[6]) : [],
      audioUrl: row[7], videoUrl: row[8], thumbnailUrl: row[12]
    };
  }

  async findRowByExecutionId(executionId) {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!A:A`,
    });
    const ids = response.data.values;
    if (!ids) return -1;
    const rowIndex = ids.findIndex(row => row && row[0] === executionId);
    return rowIndex !== -1 ? rowIndex + 1 : -1;
  }
}

module.exports = PipelineStateManager;
