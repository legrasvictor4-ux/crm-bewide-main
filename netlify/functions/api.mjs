import serverless from 'serverless-http';
import app from '../../api-server.mjs';

export const handler = serverless(app);
