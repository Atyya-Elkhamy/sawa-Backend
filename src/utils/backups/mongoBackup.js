const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('../../config/logger');
const config = require('../../config/config');
const dotenv = require('dotenv');
dotenv.config();

// Use AWS SDK v3
const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { google } = require('googleapis');

function getTimestamp() {
    const d = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${yyyy}${MM}${dd}_${hh}${mm}${ss}`;
}

function extractDbName(uri) {
    try {
        // Handle mongodb and mongodb+srv URIs; URL parser may complain without protocol adjustments
        // Fallback to regex
        const match = uri.match(/mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/i);
        if (match && match[1]) {
            return decodeURIComponent(match[1]);
        }
    } catch (e) {
        // ignore
    }
    return 'database';
}

async function uploadViaScp(filePath, fileName) {
    const host = process.env.BACKUP_SCP_HOST;
    const user = process.env.BACKUP_SCP_USER || process.env.USER;
    const port = process.env.BACKUP_SCP_PORT || '22';
    const destDir = process.env.BACKUP_SCP_DIR || '/var/backups/sawa';
    const identityFile = process.env.BACKUP_SCP_IDENTITY_FILE; // optional path to private key

    if (!host || !user) {
        throw new Error('SCP not configured: BACKUP_SCP_HOST and BACKUP_SCP_USER are required');
    }

    const dest = `${user}@${host}:${destDir}/${fileName}`;
    const options = ['-P', port];
    if (identityFile) options.push('-i', identityFile);

    // Ensure remote directory exists: use ssh to create directory with correct perms
    const mkdirCmd = ['ssh', identityFile ? `-i "${identityFile}"` : '', '-p', port, `${user}@${host}`, `mkdir -p "${destDir}"`]
        .filter(Boolean)
        .join(' ');

    const scpCmd = ['scp', ...options, `"${filePath}"`, `"${dest}"`].join(' ');

    const execAsync = (cmd) =>
        new Promise((resolve, reject) => {
            exec(cmd, { maxBuffer: 1024 * 1024 * 64 }, (error, stdout, stderr) => {
                if (error) return reject(error);
                return resolve({ stdout, stderr });
            });
        });

    await execAsync(mkdirCmd);
    await execAsync(scpCmd);

    return `scp://${dest}`;
}

async function uploadToS3(filePath, key) {
    const bucket = process.env.BACKUP_S3_BUCKET || process.env.S3_BUCKET_NAME;
    if (!bucket) {
        logger.info('S3 bucket not configured; skipping upload');
        return null;
    }

    const region = process.env.BACKUP_S3_REGION || process.env.S3_REGION || 'us-east-1';
    const endpoint = process.env.BACKUP_S3_ENDPOINT || process.env.S3_ENDPOINT; // optional (MinIO)
    const accessKeyId = process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY;

    const s3Config = { region };
    if (endpoint) {
        s3Config.endpoint = endpoint;
        s3Config.forcePathStyle = true; // helpful for MinIO
    }
    if (accessKeyId && secretAccessKey) {
        s3Config.credentials = {
            accessKeyId,
            secretAccessKey,
        };
    }

    const s3Client = new S3Client(s3Config);
    const stream = fs.createReadStream(filePath);

    const upload = new Upload({
        client: s3Client,
        params: {
            Bucket: bucket,
            Key: key,
            Body: stream,
            ContentType: 'application/gzip',
        },
    });

    await upload.done();
    return `s3://${bucket}/${key}`;
}

function cleanOldLocalBackups(dir, retentionDays = 7) {
    try {
        const now = Date.now();
        const ms = retentionDays * 24 * 60 * 60 * 1000;
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir).filter((f) => f.startsWith('mongo_backup_') && f.endsWith('.gz'));
        files.forEach((f) => {
            const fp = path.join(dir, f);
            const stat = fs.statSync(fp);
            if (now - stat.mtimeMs > ms) {
                try {
                    fs.unlinkSync(fp);
                    logger.info(`Deleted old backup: ${f}`);
                } catch (err) {
                    logger.error(`Failed deleting old backup ${f}: ${err.message}`);
                }
            }
        });
    } catch (err) {
        logger.error('Error during local backup cleanup: %s', err.message);
    }
}

async function getGoogleDriveClient() {
    // Prefer OAuth2 if refresh token exists, from env or token file
    let oauthClientId = process.env.GOOGLE_CLIENT_ID;
    let oauthClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    let oauthRedirectUri = process.env.BACKUP_GDRIVE_OAUTH_REDIRECT_URI || 'http://localhost:53682/oauth2callback';
    let oauthRefreshToken = process.env.BACKUP_GDRIVE_OAUTH_REFRESH_TOKEN;



    if (oauthClientId && oauthClientSecret && oauthRefreshToken) {
        const oAuth2Client = new google.auth.OAuth2({
            clientId: oauthClientId,
            clientSecret: oauthClientSecret,
            redirectUri: oauthRedirectUri,
        });
        oAuth2Client.setCredentials({ refresh_token: oauthRefreshToken });
        console.log('Using Google OAuth2');
        return google.drive({ version: 'v3', auth: oAuth2Client });
    }

    return null;
}

async function uploadToGoogleDrive(filePath, name, folderId) {

    const drive = await getGoogleDriveClient();
    const requestBody = { name };
    if (folderId) requestBody.parents = [folderId];
    const media = { mimeType: 'application/gzip', body: fs.createReadStream(filePath) };
    const res = await drive.files.create({ requestBody, media, fields: 'id,name,webViewLink,webContentLink' });
    return { id: res.data.id, webViewLink: res.data.webViewLink, webContentLink: res.data.webContentLink };
}

/**
 * Run a MongoDB backup using mongodump, store as a compressed archive, optionally upload to S3.
 * Returns details about the backup.
 */
async function runMongoBackup(options = {}) {
    const {
        gzip = true,
        uploadS3 = process.env.BACKUP_S3_UPLOAD === 'true' || false,
        uploadScp = process.env.BACKUP_SCP_UPLOAD === 'true' || !!process.env.BACKUP_SCP_HOST,
        uploadGDrive = process.env.BACKUP_GDRIVE_UPLOAD === 'true',
        retentionDays = Number(process.env.BACKUP_RETENTION_DAYS || 7),
        scheduleTag = '', // included in filename to denote source (e.g., 'daily')
    } = options;

    const mongoUri = config.mongoose.url;
    if (!mongoUri) {
        throw new Error('MONGODB_URL not configured');
    }
    const dbName = extractDbName(mongoUri);
    const timestamp = getTimestamp();
    const host = os.hostname();

    const backupsDir = path.resolve(__dirname, '../../../backups');
    if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

    const fileBase = `mongo_backup_${dbName}_${host}${scheduleTag ? '_' + scheduleTag : ''}_${timestamp}`;
    const archivePath = path.join(backupsDir, `${fileBase}.gz`);

    const dumpCmdParts = [
        'mongodump',
        `--uri="${mongoUri}"`,
        `--archive="${archivePath}"`,
        gzip ? '--gzip' : '',
    ].filter(Boolean);
    const dumpCommand = dumpCmdParts.join(' ');

    logger.info(`Starting MongoDB backup to ${archivePath}`);
    const execPromise = () =>
        new Promise((resolve, reject) => {
            exec(dumpCommand, { maxBuffer: 1024 * 1024 * 64 }, (error, stdout, stderr) => {
                if (error) {
                    logger.error('mongodump error: %s', error.message);
                    return reject(error);
                }
                if (stderr) logger.info(`mongodump: ${stderr}`);
                if (stdout) logger.info(`mongodump: ${stdout}`);
                return resolve();
            });
        });

    await execPromise();
    logger.info('Local backup completed');

    // Cleanup old backups
    cleanOldLocalBackups(backupsDir, retentionDays);

    let s3Url = null;
    if (uploadS3) {
        try {
            const prefix = (process.env.BACKUP_S3_PREFIX || 'db-backups').replace(/^\/+|\/+$/g, '');
            const key = `${prefix}/${fileBase}.gz`;
            s3Url = await uploadToS3(archivePath, key);
            logger.info(`Uploaded backup to ${s3Url}`);
        } catch (err) {
            logger.error('S3 upload failed: %s', err.message);
        }
    }

    let scpUrl = null;
    if (uploadScp) {
        try {
            scpUrl = await uploadViaScp(archivePath, fileBase + '.gz');
            logger.info(`Uploaded backup via SCP to ${scpUrl}`);
        } catch (err) {
            logger.error('SCP upload failed: %s', err.message);
        }
    }

    let gdrive = null;
    if (uploadGDrive) {
        try {
            const folderId = process.env.BACKUP_GDRIVE_FOLDER_ID; // optional
            gdrive = await uploadToGoogleDrive(archivePath, `${fileBase}.gz`, folderId);
            logger.info(`Uploaded backup to Google Drive: fileId=${gdrive.id}`);
        } catch (err) {
            logger.error('Google Drive upload failed: %s', err.message);
        }
    }

    return { archivePath, s3Url, scpUrl, gdrive, dbName, timestamp };
}

module.exports = { runMongoBackup };
