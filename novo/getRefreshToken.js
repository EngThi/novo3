// novo/getRefreshToken.js
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

const scopes = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/cloud-platform',
];

const authorizationUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    include_granted_scopes: true
});

console.log(`
Copie e cole esta URL no seu navegador:

${authorizationUrl}

Depois de autorizar, você será redirecionado para uma página que não carrega (localhost).
Copie o código da URL (o valor do parâmetro "code").
Exemplo: http://localhost:8080/?code=ESTE_E_O_CODIGO&scope=...
`);
