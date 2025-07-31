// novo/canvaClient.js
const { simpleOAuth2 } = require('simple-oauth2');
const { canvaConfig, scopes } = require('./canvaConfig');
const fs = require('fs');

class CanvaClient {
    constructor() {
        this.oauth2 = simpleOAuth2.create(canvaConfig);
        this.token = null; // O token será obtido via fluxo OAuth2
    }

    // O fluxo de autenticação real exigirá interação do usuário.
    // Estas funções são placeholders para quando o token for obtido.

    async setAccessToken(accessToken) {
        this.token = accessToken;
    }

    async uploadImagesToCanva(images, executionId) {
        if (!this.token) throw new Error("Access Token do Canva não está configurado.");
        const uploadedAssets = [];

        for (const [index, imagePath] of images.entries()) {
            const jobResponse = await fetch(`${canvaConfig.baseURL}/asset-uploads`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/octet-stream',
                    'Asset-Upload-Metadata': JSON.stringify({
                        name_base64: Buffer.from(`${executionId}_image_${index}`).toString('base64')
                    })
                },
                body: fs.createReadStream(imagePath)
            });

            const job = await jobResponse.json();
            // Em uma implementação real, você precisaria de um loop para verificar o status do job
            console.log(`Job de upload do Canva iniciado: ${job.job.id}`);
            // const asset = await waitForUploadCompletion(job.job.id);
            // uploadedAssets.push(asset);
        }
        return uploadedAssets;
    }

    async createThumbnail({ title, mainImage, templateId }) {
        if (!this.token) throw new Error("Access Token do Canva não está configurado.");
        
        console.log("Criando thumbnail (requer conta Enterprise para Autofill)...");
        // Lógica para a API de Autofill do Canva
        // ...
        
        // Retorno mockado por enquanto
        return { download_url: 'https://mock.canva.com/thumbnail.png' };
    }
}

module.exports = CanvaClient;
