// novo/canva/thumbnailGenerator.js
const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

class ThumbnailGenerator {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseURL = 'https://api.canva.com/rest/v1';
  }

  async createYouTubeThumbnail(title) {
    try {
      const response = await axios.post(`${this.baseURL}/designs`, {
        design_type: {
          type: 'preset',
          name: 'presentation' // 16:9
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`✅ Design base para thumbnail criado: ${response.data.id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar design no Canva:', error.response?.data || error.message);
      throw error;
    }
  }

  async exportThumbnail(designId) {
    try {
      const response = await axios.post(`${this.baseURL}/designs/${designId}/export`, {
        format: { type: 'png' }
      }, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      const jobId = response.data.job.id;
      return await this.waitForExportCompletion(jobId);
    } catch (error) {
      console.error('Erro ao exportar design do Canva:', error.response?.data || error.message);
      throw error;
    }
  }

  async waitForExportCompletion(jobId) {
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(`${this.baseURL}/designs/exports/${jobId}`, {
          headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });
        
        if (response.data.job.status === 'SUCCESS') {
          return response.data.download_urls[0];
        }
        if (response.data.job.status === 'FAILURE') {
          throw new Error(`Export do design falhou: ${response.data.job.failure_reason}`);
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      } catch (error) {
        console.error('Erro ao verificar status do export:', error.response?.data || error.message);
        attempts++;
      }
    }
    throw new Error('Timeout no export do design do Canva');
  }
}

module.exports = ThumbnailGenerator;
