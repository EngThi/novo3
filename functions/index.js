// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const crypto = require('crypto');

// Inicializa o Firebase Admin SDK apenas uma vez.
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Configuração do Canva a partir das variáveis de ambiente do Firebase
const CANVA_CONFIG = {
  clientId: functions.config().canva.client_id,
  clientSecret: functions.config().canva.client_secret,
  redirectUri: functions.config().canva.redirect_uri,
  baseURL: 'https://www.canva.com/api/oauth' // Endpoint oficial corrigido
};

// Funções auxiliares para PKCE, seguindo RFC 7636
function generateCodeVerifier() {
  return crypto.randomBytes(96).toString('base64url');
}

function generateCodeChallenge(codeVerifier) {
  return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
}

function generateSecureState() {
  return crypto.randomBytes(32).toString('base64url');
}

// Function para gerar a URL de autorização (CORRIGIDA)
exports.canvaAuthUrl = functions.https.onRequest(async (req, res) => {
  try {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método não permitido. Use POST.' });
      return;
    }
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId é obrigatório' });
      return;
    }

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateSecureState();

    await db.collection('oauth_temp').doc(userId).set({
      codeVerifier: codeVerifier,
      state: state,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    const authParams = new URLSearchParams({
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      scope: 'asset:read asset:write design:content:read design:content:write design:meta:read profile:read',
      response_type: 'code',
      client_id: CANVA_CONFIG.clientId,
      state: state,
      redirect_uri: CANVA_CONFIG.redirectUri
    });

    const authUrl = `${CANVA_CONFIG.baseURL}/authorize?${authParams}`;
    res.status(200).json({ authUrl: authUrl, state: state });

  } catch (error) {
    console.error('❌ Erro ao gerar URL de autorização:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Function de callback (CORRIGIDA)
exports.canvaOAuthCallback = functions.https.onRequest(async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    res.set('Access-Control-Allow-Origin', '*');

    if (error) {
      console.error('❌ Erro na autorização do Canva:', error, error_description);
      return res.status(400).send(createErrorPage('Erro na Autorização', error, error_description));
    }
    if (!code || !state) {
      return res.status(400).send(createErrorPage('Parâmetros Ausentes', 'Código de autorização ou state não recebido.'));
    }

    const tempQuery = await db.collection('oauth_temp').where('state', '==', state).limit(1).get();
    if (tempQuery.empty) {
      return res.status(400).send(createErrorPage('Sessão Expirada', 'State não encontrado ou expirado. Tente iniciar o processo novamente.'));
    }

    const tempDoc = tempQuery.docs[0];
    const userId = tempDoc.id;
    const { codeVerifier } = tempDoc.data();

    const tokenResponse = await fetch(`https://api.canva.com/rest/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CANVA_CONFIG.clientId,
        client_secret: CANVA_CONFIG.clientSecret,
        code: code,
        redirect_uri: CANVA_CONFIG.redirectUri,
        code_verifier: codeVerifier
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      throw new Error(`Falha na troca de token: ${errorData}`);
    }

    const tokenData = await tokenResponse.json();
    await db.collection('user_tokens').doc(userId).set({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      expires_in: tokenData.expires_in,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expires_at: new Date(Date.now() + (tokenData.expires_in * 1000))
    });

    await tempDoc.ref.delete();
    console.log(`✅ Token salvo para usuário: ${userId}`);
    res.status(200).send(createSuccessPage());

  } catch (error) {
    console.error('❌ Erro no callback OAuth:', error);
    res.status(500).send(createErrorPage('Erro Interno do Servidor', error.message));
  }
});

// Funções auxiliares para páginas HTML de resposta
function createErrorPage(title, error, description = '') {
  return `<html><body><h1>❌ ${title}</h1><p><strong>Erro:</strong> ${error}</p>${description ? `<p><strong>Descrição:</strong> ${description}</p>` : ''}</body></html>`;
}
function createSuccessPage() {
  return `<html><body><h1>✅ Autorização Concluída!</h1><p>Pode fechar esta janela.</p><script>setTimeout(() => { window.close(); }, 3000);</script></body></html>`;
}
