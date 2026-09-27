import { readLocalGitRepo } from '../../src/server/gitService.js';

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' })
    };
  }

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const { repoPath } = payload;

    if (!repoPath || typeof repoPath !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid "repoPath" parameter is required.' })
      };
    }

    const result = await readLocalGitRepo(repoPath);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: err.message || 'Scanning a local disk path is only supported when running the app locally on your machine.'
      })
    };
  }
};
