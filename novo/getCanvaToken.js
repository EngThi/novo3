// novo/getCanvaToken.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
// Correção na importação
const { AuthorizationCode } = require('simple-oauth2');
const { canvaConfig, scopes } = require('./canvaConfig');

const client = new AuthorizationCode({
    client: {
        id: canvaConfig.clientId,
        secret: canvaConfig.clientSecret,
    },
    auth: canvaConfig.auth,
});

const authorizationUrl = client.authorizeURL({
    scope: scopes.join(' '),
    state: `state_${Date.now()}`
});

console.log(`
Copie e cole esta URL no seu navegador para autorizar o aplicativo Canva:

${authorizationUrl}

Depois de autorizar, você será redirecionado para a sua URL de callback.
Copie o código da URL (o valor do parâmetro "code").
Exemplo: https://www.example.com/oauth/callback?code=ESTE_E_O_CODIGO&state=...
`);
