// novo/auth/oauth.js
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

class CanvaAuth {
  constructor() {
    this.clientId = process.env.CANVA_CLIENT_ID;
    this.clientSecret = process.env.CANVA_CLIENT_SECRET;
    this.redirectUri = 'http://127.0.0.1:3001/oauth/redirect';
    this.baseURL = 'https://api.canva.com';
    this.codeVerifier = null;
  }

  generatePKCE() {
    const codeVerifier = crypto.randomBytes(96).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    
    return { codeVerifier, codeChallenge };
  }

  getAuthorizationUrl() {
    const { codeVerifier, codeChallenge } = this.generatePKCE();
    
    this.codeVerifier = codeVerifier;
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'asset:read asset:write design:content:read design:content:write design:meta:read profile:read',
      code_challenge_method: 'S256',
      code_challenge: codeChallenge
    });

    return `https://www.canva.com/api/oauth/authorize?${params}`;
  }

  async exchangeCodeForToken(authCode) {
    if (!this.codeVerifier) {
      throw new Error("Code Verifier não encontrado.");
    }

    try {
      const response = await axios.post(`${this.baseURL}/rest/v1/oauth/token`, new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: authCode,
        redirect_uri: this.redirectUri,
        code_verifier: this.codeVerifier
      }).toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Erro na troca do token:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = CanvaAuth;
