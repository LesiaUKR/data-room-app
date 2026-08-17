import { config } from '../config/index.js';
import { VercelBlobStorage } from './vercel-blob.storage.js';

const storage = new VercelBlobStorage({ token: config.blobReadWriteToken });

export { storage };
