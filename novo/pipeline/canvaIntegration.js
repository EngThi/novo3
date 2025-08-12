// novo/pipeline/canvaIntegration.js
const CanvaAssetManager = require('../canva/assetManager');
const ThumbnailGenerator = require('../canva/thumbnailGenerator');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

class CanvaPipelineIntegration {
  constructor(accessToken) {
    if (!accessToken) {
      throw new Error("Canva Access Token é necessário para a integração.");
    }
    this.assetManager = new CanvaAssetManager(accessToken);
    this.thumbnailGenerator = new ThumbnailGenerator(accessToken);
  }

  async processVideoAssets(executionData) {
    const { images, script, executionId } = executionData;
    const results = {
      uploadedAssets: [],
      thumbnailUrl: null,
      designId: null
    };

    try {
      console.log('📤 Fazendo upload das imagens para o Canva...');
      for (let i = 0; i < images.length; i++) {
        const imagePath = images[i];
        const assetName = `${executionId}_image_${i}`;
        
        const asset = await this.assetManager.uploadImageAsset(imagePath, assetName);
        results.uploadedAssets.push(asset);
        console.log(`✅ Asset enviado: ${asset.id}`);
      }

      console.log('🎨 Criando o design da thumbnail...');
      const title = this.extractTitle(script);
      const design = await this.thumbnailGenerator.createYouTubeThumbnail(title);
      results.designId = design.id;

      console.log('📥 Exportando a thumbnail...');
      const thumbnailUrl = await this.thumbnailGenerator.exportThumbnail(design.id);
      results.thumbnailUrl = thumbnailUrl;

      console.log('🎯 Integração com o Canva concluída com sucesso!');
      return results;
    } catch (error) {
      console.error('❌ A integração com o Canva falhou:', error);
      throw error;
    }
  }

  extractTitle(script) {
    const lines = script.split(`
`).filter(line => line.trim() !== '');
    const title = lines[0] || 'Novo Vídeo Gerado';
    return title.substring(0, 80);
  }
}

module.exports = CanvaPipelineIntegration;
