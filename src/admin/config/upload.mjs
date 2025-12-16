import uploadFeature from '@adminjs/upload';
import { componentLoader } from '../resources/components/component-loader.mjs';

const uploadOptions = {
    componentLoader,
    provider: {
        aws: {
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY,
                secretAccessKey: process.env.S3_SECRET_KEY,
                region: process.env.S3_REGION,
                bucket: process.env.S3_BUCKET_NAME || "sawa-sawa"
            },
            region: process.env.S3_REGION,
            bucket: process.env.S3_BUCKET_NAME || "sawa-sawa"
        },
    },
};

const awsUploadFeature = (
    options
) => {
    return uploadFeature({
        ...uploadOptions,
        ...options,
    });
};

export default awsUploadFeature;