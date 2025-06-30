import express from 'express';
const router = express.Router();
import authenticateToken from '../middleware/authMiddleware.js';
import { minioClient } from '../config/minioConfig.js';

router.get('/download/:bucketName/:objectName', authenticateToken, async (req, res) => {
    const { bucketName, objectName } = req.params;

    try {
        const exists = await minioClient.bucketExists(bucketName);
        if (!exists) {
            return res.status(404).json({ error: 'Bucket not found' });
        }

        const dataStream = await minioClient.getObject(bucketName, objectName);

        res.header('Content-Disposition', `attachment; filename="${objectName}"`);
        res.header('Content-Type', 'application/octet-stream');

        dataStream.pipe(res);

    } catch (error) {
        console.error(`Error downloading file: ${error.message}`);
        res.status(500).json({ error: 'Failed to download file' });
    }
});