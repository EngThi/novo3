// novo/canva/assetManager.js
const axios = require('axios');
const fs = require('fs');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

class CanvaAssetManager {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseURL = 'https://api.canva.com/rest/v1';
  }

  async uploadImageAsset(imagePath, assetName) {
    try {
      const metadata = {
        name_base64: Buffer.from(assetName).toString('base64')
      };
      const imageBuffer = fs.readFileSync(imagePath);

      const response = await axios.post(`${this.baseURL}/asset-uploads`, imageBuffer, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/octet-stream',
          'Asset-Upload-Metadata': JSON.stringify(metadata)
        }
      });

      const jobId = response.data.job.id;
      return await this.waitForUploadCompletion(jobId);
    } catch (error) {
      console.error('Erro no upload do asset para o Canva:', error.response?.data || error.message);
      throw error;
    }
  }

  async waitForUploadCompletion(jobId) {
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(`${this.baseURL}/asset-uploads/${jobId}`, {
          headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });

        if (response.data.job.status === 'SUCCESS') {
          return response.data.asset;
        }
        if (response.data.job.status === 'FAILURE') {
          throw new Error(`Upload do asset falhou: ${response.data.job.failure_reason}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      } catch (error) {
        console.error('Erro ao verificar status do upload:', error.response?.data || error.message);
        attempts++;
      }
    }

    throw new Error('Timeout no upload do asset para o Canva');
  }

  async listAssets() {
    try {
      const response = await axios.get(`${this.baseURL}/assets`, {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });
      return response.data.items;
    } catch (error) {
      console.error('Erro ao listar assets do Canva:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = CanvaAssetManager;
