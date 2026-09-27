import { cloneAndExtract } from '../../src/server/gitService.js';

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
    const { repoUrl, branch } = payload;

    if (!repoUrl || typeof repoUrl !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid "repoUrl" parameter is required.' })
      };
    }

    const result = await cloneAndExtract(repoUrl, branch);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
  } catch (err) {
    console.error('Git clone error in Netlify function:', err);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: err.message || 'Failed to clone repository.' })
    };
  }
};
