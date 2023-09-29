const { PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { authenticate } = require('../helpers/authenticate');

module.exports.handler = async (event, context) => {
  const authorization = event.headers.Authorization ?? event.headers.authorization ?? ''
  const accessToken = authorization.split(' ')[1];

  if (!accessToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Unauthorized',
      }),
    };
  }

  const { folderName } = authenticate(accessToken);

  console.log('FOLDER NAME: ', folderName);

  const bucketClient = new S3Client();

  const photoFileName = `${Date.now()}.png`;

  const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: `organizations/${folderName}/logos/${photoFileName}`,
    ACL: 'public-read',
    ContentType: 'image/png',
  });

  const presignedUrl = await getSignedUrl(bucketClient, command, { expiresIn: 3600 });

  return {
    statusCode: 200,
    body: JSON.stringify({
      presignedUrl,
      photoFileName,
    }),
  };
};
