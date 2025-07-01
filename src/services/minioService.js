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

const defaultBucketName = process.env.MINIO_BUCKET_NAME;

minioClient.bucketExists(defaultBucketName, function(err, exists) {
    if (err) {
        return logger.error(err);
    }
    if (!exists) {
        minioClient.makeBucket(defaultBucketName, ' ', function(err) {
            if (err) return logger.error("创建桶时遇到错误", err);
            logger.info(`Bucket '${defaultBucketName}' 创建成功'`);
        });
    } else {
        logger.warn(`Bucket '${defaultBucketName}' 已经存在`);
    }
});

class MinioService {
    async initiateMultipartUpload(bucket, objectName, contentType) {
        try {
            const uploadId = Date.now().toString() + '-' + Math.random().toString(36).substring(2, 15);
            logger.debug(`初始化上传 ${objectName} 到桶 ${bucket}, ID: ${uploadId}`);
            return uploadId;
        } catch (error) {
            logger.error('无法初始化分片上传', error);
            throw error;
        }
    }

    async uploadPart(bucket, objectName, chunk, partNumber, uploadId) {
        try {
            const tempObjectName = `${objectName}.part${partNumber}.${uploadId}`;
            const etagResult = await minioClient.putObject(bucket, tempObjectName, chunk, chunk.length, { 'Content-Type': 'application/octet-stream' });
            logger.debug(`${objectName} 的第 ${partNumber} 部分上传中 (temp: ${tempObjectName}) 到桶 ${bucket}, ETag: ${etagResult.etag}`);
            return { etag: etagResult.etag, tempObjectName };
        } catch (error) {
            logger.error(`上传 ${objectName} 的第${partNumber}部分到桶 ${bucket} 时遇上错误`);
            throw error;
        }
    }

    async completeMultipartUpload(bucket, objectName, uploadId, uploadedParts) {
        try {
            uploadedParts.sort((a, b) => a.partNumber - b.partNumber);

            const sourceList = uploadedParts.map(part => {
                return new minio.CopySourceOptions({
                    Bucket: bucket,
                    Object: part.tempObjectName,
                    ETag: `"${part.etag}"`,
                });
            });

            const destOption = new minio.CopyDestinationOptions({
                Bucket: bucket,
                Object: objectName,
            });

            await minioClient.composeObject(destOption, sourceList);

            logger.debug(`成功上传 ${objectName} 到 minio 桶 ${bucket}`);
            // 清理临时文件
            for (const part of uploadedParts) {
                await minioClient.removeObject(bucket, part.tempObjectName);
                logger.debug(`临时文件 ${part.tempObjectName} 已删除`);
            }

            return { message: 'Upload successfully', objectName };
        } catch (error) {
            logger.error(`合并 ${objectName} 分片到桶 ${bucket} 时遇到问题:`, error);
            throw error;
        }
    }

    async abortMultipartUpload(bucket, uploadId, objectName) {
        try {
            logger.debug(`合并文件上传终止 ${objectName} 在桶 ${bucket}`);
            return { message: '合并文件上传终止' };
        } catch (error) {
            logger.error(`中断 ${objectName} 的上传任务在桶 ${bucket} 时遇到错误:`, error);
            throw error;
        }
    }

    async getFileStream(bucket, objectName) {
        try {
            logger.debug(`尝试从桶 '${bucket}' 下载文件: '${objectName}'`);
            // Check if the bucket exists first (optional, MinIO client will error if not)
            const bucketExists = await minioClient.bucketExists(bucket);
            if (!bucketExists) {
                const error = new Error(`Bucket '${bucket}' 不存在.`);
                error.statusCode = 404; // Custom status code for bucket not found
                throw error;
            }

            const stat = await minioClient.statObject(bucket, objectName);
            const fileStream = await minioClient.getObject(bucket, objectName);
            logger.info(`成功从桶 '${bucket}' 获取文件流: '${objectName}'`);
            return { fileStream, stat }; // Return both stream and metadata
        } catch (error) {
            logger.error(`无法从桶 '${bucket}' 下载文件 '${objectName}':`, error);
            // Handle specific MinIO errors, e.g., object not found
            if (error.code === 'NoSuchKey') {
                const notFoundError = new Error(`文件 '${objectName}' 在桶 '${bucket}' 中不存在.`);
                notFoundError.statusCode = 404; // Custom status code for file not found
                throw notFoundError;
            }
            throw error;
        }
    }
}

export default new MinioService();