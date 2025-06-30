import { Client } from 'minio';
import * as minio from 'minio';
import logger from "../config/pino.js";
const minioClient = new Client({
    endPoint: process.env.MINIO_ENDPOINT,
    port: parseInt(process.env.MINIO_PORT),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY
});

const bucketName = process.env.MINIO_BUCKET_NAME;

minioClient.bucketExists(bucketName, function(err, exists) {
    if (err) {
        return logger.error(err);
    }
    if (!exists) {
        minioClient.makeBucket(bucketName, ' ', function(err) {
            if (err) return logger.error("创建桶时遇到错误", err);
            logger.info(`Bucket '${bucketName}' 创建成功'`);
        });
    } else {
        logger.warn(`Bucket '${bucketName}' 已经存在`);
        
    }
});

class MinioService {
    async initiateMultipartUpload(objectName, contentType) {
        try {
            const uploadId = Date.now().toString() + '-' + Math.random().toString(36).substring(2, 15);
            logger.debug(`初始化上传 ${objectName} ,ID: ${uploadId}`);
            return uploadId;
        } catch (error) {
            logger.error('无法初始化分片上传',error);
            throw error;
        }
    }

    async uploadPart(objectName, chunk, partNumber, uploadId) {
        try {
            const tempObjectName = `${objectName}.part${partNumber}.${uploadId}`;
            const etagResult = await minioClient.putObject(bucketName, tempObjectName, chunk, chunk.length, { 'Content-Type': 'application/octet-stream' });
            logger.debug(`${objectName} 的第 ${partNumber} 部分上传中  (temp: ${tempObjectName}) ,ETag: ${etagResult.etag}`);
            return { etag: etagResult.etag, tempObjectName };
        } catch (error) {
            logger.error(`上传 ${objectName} 的第${partNumber}部分时遇上错误`);
            throw error;
        }
    }

async completeMultipartUpload(objectName, uploadId, uploadedParts) {
    try {
        uploadedParts.sort((a, b) => a.partNumber - b.partNumber);

        const sourceList = uploadedParts.map(part => {
            return new minio.CopySourceOptions({
                Bucket: bucketName,
                Object: part.tempObjectName,
                ETag: `"${part.etag}"`,
            });
        });

        const destOption = new minio.CopyDestinationOptions({
            Bucket: bucketName,
            Object: objectName,
        });

        await minioClient.composeObject(destOption, sourceList);

        logger.debug(`成功上传 ${objectName} 到 minio`);
        // 清理临时文件
        for (const part of uploadedParts) {
            await minioClient.removeObject(bucketName, part.tempObjectName);
            logger.debug(`临时文件 ${part.tempObjectName} 已删除`);
        }

        return { message: 'Upload successfully', objectName };
    } catch (error) {
        logger.error(`合并 ${objectName} 分片时遇到问题:`, error);
        throw error;
    }
}

    async abortMultipartUpload(uploadId, objectName) {
        try {
            return { message: '合并文件上传终止' };
        } catch (error) {
            logger.error(`中断 ${objectName} 的上传任务时遇到错误:`, error);
            throw error;
        }
    }
}

export default new MinioService();