import { config } from '../config/index.js';
import { VercelBlobStorage } from './vercel-blob.storage.js';

// Composition root: builds the adapter once and exports it ready to use
const storage = new VercelBlobStorage({ token: config.blobReadWriteToken });

export { storage };
