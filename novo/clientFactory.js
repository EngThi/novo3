// novo/clientFactory.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const aiplatform = require('@google-cloud/aiplatform');
const texttospeech = require('@google-cloud/text-to-speech');
const { GoogleAuth } = require('google-auth-library');

const {
  GEMINI_API_KEY,
  GOOGLE_DRIVE_REFRESH_TOKEN,
  OAUTH_CLIENT_ID,
  OAUTH_CLIENT_SECRET,
  OAUTH_REDIRECT_URI,
  LOCATION,
} = process.env;

class ClientFactory {
    constructor() {
        this.clients = new Map();
        // Exportando os helpers junto com a factory
        this.helpers = aiplatform.helpers;
    }

    _createAuthenticatedClient(key, creator) {
        if (!this.clients.has(key)) {
            this.clients.set(key, creator());
        }
        return this.clients.get(key);
    }

    getGeminiClient() {
        return this._createAuthenticatedClient('gemini', () => {
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            return genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        });
    }

    getGoogleAuthClient() {
        return this._createAuthenticatedClient('googleAuth', () => 
            new GoogleAuth({
                keyFilename: 'novo/google-drive-credentials.json',
                scopes: 'https://www.googleapis.com/auth/cloud-platform'
            })
        );
    }

    getVertexAiClient() {
        return this._createAuthenticatedClient('vertexAi', () => 
            new aiplatform.v1.PredictionServiceClient({
                apiEndpoint: `${LOCATION}-aiplatform.googleapis.com`,
                auth: this.getGoogleAuthClient()
            })
        );
    }
    
    getTextToSpeechClient() {
        return this._createAuthenticatedClient('textToSpeech', () => 
            new texttospeech.TextToSpeechClient({
                auth: this.getGoogleAuthClient()
            })
        );
    }
    
    getDriveClient() {
        return this._createAuthenticatedClient('drive', () => {
            const oauth2Client = new google.auth.OAuth2(OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REDIRECT_URI);
            oauth2Client.setCredentials({ refresh_token: GOOGLE_DRIVE_REFRESH_TOKEN });
            return google.drive({ version: 'v3', auth: oauth2Client });
        });
    }

    getSheetsClient() {
        return this._createAuthenticatedClient('sheets', () => {
            const oauth2Client = new google.auth.OAuth2(OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REDIRECT_URI);
            oauth2Clien.setCredentials({ refresh_token: GOOGLE_DRIVE_REFRESH_TOKEN });
            return google.sheets({ version: 'v4', auth: oauth2Client });
        });
    }

    // --- MOCK CLIENTS ---

    getMockDriveClient() {
        console.log("[ClientFactory] Using Mock Drive Client");
        const mockFiles = new Map();
        return {
            files: {
                list: async ({ q }) => {
                    console.log(`[MockDrive] LIST q="${q}"`);
                    const nameMatch = q.match(/name='([^']+)'/);
                    if (nameMatch && nameMatch[1]) {
                        const name = nameMatch[1];
                        if (mockFiles.has(name)) {
                            return { data: { files: [{ id: mockFiles.get(name) }] } };
                        }
                    }
                    return { data: { files: [] } };
                },
                create: async ({ resource }) => {
                    console.log(`[MockDrive] CREATE name="${resource.name}"`);
                    const id = `mock_id_${Date.now()}`;
                    mockFiles.set(resource.name, id);
                    return { data: { id } };
                },
                // Adiciona uma função de upload simulada
                update: async ({ media, resource, fileId }) => {
                     console.log(`[MockDrive] UPLOAD/UPDATE fileId="${fileId}"`);
                     // Não faz nada, apenas simula a chamada
                     return { data: { webViewLink: `https://mock.drive.google.com/file/d/${fileId}` } };
                }
            }
        };
    }

    getMockSheetsClient() {
        console.log("[ClientFactory] Using Mock Sheets Client");
        const mockSheetData = []; // Agora um array de arrays para simular linhas e colunas
        return {
            spreadsheets: {
                values: {
                    append: async ({ spreadsheetId, range, valueInputOption, resource }) => {
                        console.log(`[MockSheets] APPEND to range="${range}"`);
                        const newRow = resource.values[0];
                        mockSheetData.push(newRow);
                        return { data: { updates: { updatedRange: `A${mockSheetData.length}` } } };
                    },
                    get: async ({ spreadsheetId, range }) => {
                        console.log(`[MockSheets] GET from range="${range}"`);
                        const parts = range.split('!');
                        const cellRange = parts.length > 1 ? parts[1] : parts[0];

                        if (cellRange === 'A:A') { // Requisição para a coluna A inteira
                            return { data: { values: mockSheetData.map(row => [row[0]]) } };
                        }

                        const rowMatch = cellRange.match(/A(\d+):M(\d+)/);
                        if (rowMatch) {
                            const startRow = parseInt(rowMatch[1], 10);
                            const endRow = parseInt(rowMatch[2], 10);
                            if (startRow > 0 && startRow <= mockSheetData.length) {
                                return { data: { values: [mockSheetData[startRow - 1]] } };
                            }
                        }
                        // Retorna um estado padrão se não encontrar nada ou range inválido
                        return { data: { values: [] } };
                    },
                    update: async ({ spreadsheetId, range, valueInputOption, resource }) => {
                        console.log(`[MockSheets] UPDATE range="${range}"`);
                        const parts = range.split('!');
                        const cellRange = parts.length > 1 ? parts[1] : parts[0];
                        const colMatch = cellRange.match(/([A-Z]+)(\d+)/);
                        if (colMatch) {
                            const colLetter = colMatch[1];
                            const rowIndex = parseInt(colMatch[2], 10) - 1; // 0-based index
                            const colIndex = colLetter.charCodeAt(0) - 'A'.charCodeAt(0);

                            if (rowIndex >= 0 && rowIndex < mockSheetData.length) {
                                if (!mockSheetData[rowIndex]) mockSheetData[rowIndex] = [];
                                mockSheetData[rowIndex][colIndex] = resource.values[0][0];
                            }
                        }
                        return { data: { updatedCells: 1 } };
                    },
                    batchUpdate: async ({ spreadsheetId, resource }) => {
                        console.log("[MockSheets] BATCH UPDATE");
                        for (const item of resource.data) {
                            const range = item.range;
                            const values = item.values;
                            const parts = range.split('!');
                            const cellRange = parts.length > 1 ? parts[1] : parts[0];
                            const colMatch = cellRange.match(/([A-Z]+)(\d+)/);
                            if (colMatch) {
                                const colLetter = colMatch[1];
                                const rowIndex = parseInt(colMatch[2], 10) - 1; // 0-based index
                                const colIndex = colLetter.charCodeAt(0) - 'A'.charCodeAt(0);

                                if (rowIndex >= 0 && rowIndex < mockSheetData.length) {
                                    if (!mockSheetData[rowIndex]) mockSheetData[rowIndex] = [];
                                    mockSheetData[rowIndex][colIndex] = values[0][0];
                                }
                            }
                        }
                        return { data: {} };
                    }
                }
            }
        };
    }
}

module.exports = new ClientFactory();