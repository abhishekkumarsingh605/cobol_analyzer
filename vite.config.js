import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { cloneAndExtract, readLocalGitRepo } from './src/server/gitService.js';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'git-api-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          // Handle remote git clone
          if (req.method === 'POST' && req.url === '/api/git/clone') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const { repoUrl, branch } = JSON.parse(body || '{}');
                const result = await cloneAndExtract(repoUrl, branch);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
              } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message || 'Clone failed' }));
              }
            });
            return;
          }

          // Handle local git repository scanning
          if (req.method === 'POST' && req.url === '/api/git/local') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const { repoPath } = JSON.parse(body || '{}');
                const result = await readLocalGitRepo(repoPath);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
              } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message || 'Local read failed' }));
              }
            });
            return;
          }

          next();
        });
      }
    }
  ]
});
