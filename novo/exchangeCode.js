// novo/exchangeCode.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { google } = require('googleapis');

const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI;

const oauth2Client = new google.auth.OAuth2(
    OAUTH_CLIENT_ID,
    OAUTH_CLIENT_SECRET,
    OAUTH_REDIRECT_URI
);

async function exchangeCodeForToken(code) {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log('Tokens obtidos com sucesso!');
        console.log(`
--- NOVO REFRESH TOKEN (copie e cole no seu .env) ---
${tokens.refresh_token}

--- Access Token (curta duração) ---
${tokens.access_token}
`);
    } catch (error) {
        console.error('Erro ao trocar o código pelo token:', error.message);
    }
}

const code = process.argv[2];
if (!code) {
    console.error('Por favor, forneça o código de autorização como um argumento.');
    console.log('Exemplo: node novo/exchangeCode.js SEU_CODIGO_AQUI');
    process.exit(1);
}

exchangeCodeForToken(code);
