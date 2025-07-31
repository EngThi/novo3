// novo/canvaConfig.js

const canvaConfig = {
  clientId: process.env.CANVA_CLIENT_ID,
  clientSecret: process.env.CANVA_CLIENT_SECRET,
  auth: {
    // A autorização acontece no domínio principal do Canva
    authorizeHost: 'https://www.canva.com',
    // O caminho de autorização do usuário correto é /apps/authorise
    authorizePath: '/apps/authorise',
    // A troca do token acontece no subdomínio da API
    tokenHost: 'https://api.canva.com',
    tokenPath: '/rest/v1/oauth/token',
  },
  baseURL: 'https://api.canva.com/rest/v1'
};

const scopes = [
  'design:content:read_write',
  'asset:read_write', 
  'profile:read'
];

module.exports = { canvaConfig, scopes };
