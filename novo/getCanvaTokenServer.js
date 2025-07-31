// novo/getCanvaTokenServer.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const crypto = require('crypto');
const { canvaConfig, scopes } = require('./canvaConfig');

const app = express();
const port = 3001;

// --- PKCE Helper Functions ---
const base64UrlEncode = (str) => {
    return str.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};
const sha256 = (buffer) => {
    return crypto.createHash('sha256').update(buffer).digest();
};

let codeVerifier;

app.get('/', (req, res) => {
    const redirectUri = process.env.CANVA_REDIRECT_URI;
    if (!redirectUri || redirectUri.includes('SEU-HOSTNAME-AQUI')) {
        const message = "ERRO: A variável CANVA_REDIRECT_URI não está configurada no seu arquivo .env. Por favor, copie a URL pública que o Firebase Studio forneceu para esta página, adicione-a ao seu .env e reinicie o servidor.";
        console.error(message);
        res.status(500).send(`<h1>Configuração Incompleta</h1><p>${message}</p>`);
        return;
    }

    codeVerifier = base64UrlEncode(crypto.randomBytes(32));
    const codeChallenge = base64UrlEncode(sha256(Buffer.from(codeVerifier)));

    const authUrl = new URL(canvaConfig.auth.authorizeHost + canvaConfig.auth.authorizePath);
    authUrl.searchParams.append('client_id', canvaConfig.clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('state', `state_${Date.now()}`);
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');

    console.log(`
✅ URL de autorização gerada.

PASSO 1: Copie e cole esta URL no seu navegador:

${authUrl.toString()}
`);
    res.send(`<h1>Canva Auth Helper</h1><p>URL de autorização foi gerada no seu terminal. Siga o link para continuar.</p><p><a href="${authUrl.toString()}">Autorizar com o Canva</a></p>`);
});

app.get('/oauth/redirect', async (req, res) => {
    const { code } = req.query;
    if (!code) {
        res.status(400).send('<h1>Erro:</h1><p>O código de autorização não foi encontrado.</p>');
        return;
    }
    try {
        const tokenResponse = await fetch(canvaConfig.auth.tokenHost + canvaConfig.auth.tokenPath, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: canvaConfig.clientId,
                client_secret: canvaConfig.clientSecret,
                code: code,
                code_verifier: codeVerifier,
                redirect_uri: process.env.CANVA_REDIRECT_URI
            })
        });
        const tokens = await tokenResponse.json();
        if (tokens.error) throw new Error(tokens.error_description);

        console.log(`
✅ SUCESSO! Tokens recebidos:

--- Access Token ---
${tokens.access_token}

--- Refresh Token ---
${tokens.refresh_token}
`);
        res.send('<h1>Sucesso!</h1><p>Verifique o terminal para seus tokens. Este servidor será desligado em breve.</p>');
    } catch (error) {
        console.error('❌ ERRO AO OBTER O TOKEN:', error.message);
        res.status(500).send(`<h1>Erro:</h1><p>${error.message}</p>`);
    } finally {
        setTimeout(() => process.exit(0), 5000);
    }
});

app.listen(port, () => {
    console.log(`Servidor de autenticação do Canva rodando na porta ${port}.`);
    console.log('AGUARDE a notificação do Firebase Studio no canto inferior direito e clique para abrir a URL pública.');
});
