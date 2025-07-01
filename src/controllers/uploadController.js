import minioService from '../services/minioService.js';
import formidable from 'formidable';
import fs from 'fs';
import logger from "../config/pino.js";
import path from "path";

const activeUploads = {};

class UploadController {

    async initiateUpload(req, res) {
        try {
            const { fileName, contentType, bucketName } = req.body;
            if (!fileName || !contentType || !bucketName) {
                return res.status(400).json({ message: 'fileName, contentType, and bucketName are required.' });
            }

            const objectName = `${req.user.userId}/${Date.now()}-${fileName}`;
            const uploadId = await minioService.initiateMultipartUpload(bucketName, objectName, contentType);

            activeUploads[uploadId] = {
                bucketName,
                objectName,
                contentType,
                uploadedParts: []
            };

            res.status(200).json({ uploadId, objectName, bucketName });
        } catch (error) {
            logger.error('无法初始化上传', error);
            res.status(500).json({ message: 'Failed to initiate upload', error: error.message });
        }
    }

    async uploadPart(req, res) {
        const { uploadId, partNumber } = req.query;
        if (!uploadId || !partNumber) {
            return res.status(400).json({ message: 'uploadId and partNumber are required.' });
        }

        const uploadSession = activeUploads[uploadId];
        if (!uploadSession) {
            return res.status(404).json({ message: 'Upload session not found.' });
        }

        const form = formidable({ multiples: false });

        form.parse(req, async (err, fields, files) => {
            if (err) {
                logger.error('无法从列表解析数据', err);
                return res.status(500).json({ message: 'Error processing file part', error: err.message });
            }

            const filePart = files.file;
            if (!filePart || !filePart[0]) {
                return res.status(400).json({ message: 'File part is missing.' });
            }

            const partPath = filePart[0].filepath;
            const partBuffer = fs.readFileSync(partPath);

            try {
                const { etag, tempObjectName } = await minioService.uploadPart(
                    uploadSession.bucketName,
                    uploadSession.objectName,
                    partBuffer,
                    parseInt(partNumber),
                    uploadId
                );

                uploadSession.uploadedParts.push({
                    etag,
                    tempObjectName,
                    partNumber: parseInt(partNumber)
                });

                res.status(200).json({ message: `Part ${partNumber} uploaded successfully`, etag });
            } catch (error) {
                logger.error('Error uploading file part to MinIO:', error);
                res.status(500).json({ message: 'Failed to upload file part', error: error.message });
            } finally {
                fs.unlink(partPath, (unlinkErr) => {
                    if (unlinkErr) logger.error('Error deleting temp file:', unlinkErr);
                });
            }
        });
    }

    async completeUpload(req, res) {
        const { uploadId } = req.body;
        if (!uploadId) {
            return res.status(400).json({ message: 'uploadId is required.' });
        }

        const uploadSession = activeUploads[uploadId];
        if (!uploadSession) {
            return res.status(404).json({ message: 'Upload session not found or already completed.' });
        }

        try {
            const result = await minioService.completeMultipartUpload(
                uploadSession.bucketName,
                uploadSession.objectName,
                uploadId,
                uploadSession.uploadedParts
            );

            delete activeUploads[uploadId];
            res.status(200).json(result);
        } catch (error) {
            logger.error('Error completing upload:', error);
            res.status(500).json({ message: 'Failed to complete upload', error: error.message });
        }
    }

    async abortUpload(req, res) {
        const { uploadId } = req.body;
        if (!uploadId) {
            return res.status(400).json({ message: 'uploadId is required.' });
        }

        const uploadSession = activeUploads[uploadId];
        if (!uploadSession) {
            return res.status(404).json({ message: 'Upload session not found.' });
        }

        try {
            const result = await minioService.abortMultipartUpload(
                uploadSession.bucketName,
                uploadId,
                uploadSession.objectName
            );

            delete activeUploads[uploadId];
            res.status(200).json(result);
        } catch (error) {
            logger.error('Error aborting upload:', error);
            res.status(500).json({ message: 'Failed to abort upload', error: error.message });
        }
    }

    async downloadFile(req, res) {
        const splat = req.params.splat;

        if (!Array.isArray(splat) || splat.length === 0) {
            return res.status(400).json({ message: '缺少 Bucket 或是路径参数' });
        }

        const [bucketName, ...filePathSegments] = splat;
        const filePath = filePathSegments.join('/');

        if (!bucketName || !filePath) {
            return res.status(400).json({ message: '缺少 Bucket 或是路径参数' });
        }

        try {
            const { fileStream, stat } = await minioService.getFileStream(bucketName, filePath);

            res.setHeader('Content-Type', stat.metaData['content-type'] || 'application/octet-stream');
            res.setHeader('Content-Length', stat.size);
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(path.basename(filePath))}"`);

            fileStream.pipe(res);

            fileStream.on('end', () => {
            logger.info(`文件 '${filePath}' 成功下载.`);
            });

            fileStream.on('error', (err) => {
            logger.error(`流传输失败:`, err);
            if (!res.headersSent) {
                return res.status(500).json({ message: '下载失败', error: err.message });
            }
            res.end();
            });

        } catch (error) {
            logger.error(`下载时发生错误:`, error);
            if (!res.headersSent) {
            return res.status(500).json({ message: '下载失败', error: error.message });
            }
            res.end();
        }
    }

}

export default new UploadController();