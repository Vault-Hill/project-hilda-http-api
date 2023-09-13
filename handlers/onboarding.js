const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

module.exports.handler = async (event, context) => {
  const body = JSON.parse(event.body);

  const dynamoDBClient = new DynamoDBClient();
  const bucketClient = new S3Client();

  const orgFolderName = body.orgName.replace(/\s/g, '_');

  // STEP 1:  Create the s3 bucket
  const createBucketPromise = bucketClient.send(
    new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: `organizations/${orgFolderName}/`,
    }),
  );

  // STEP 2: Create the organization record in dynamodb
  const createOrganizationPromise = dynamoDBClient.send(
    new PutItemCommand({
      TableName: `${process.env.APP_NAME}-organizations`,
      Item: {
        id: { S: body.orgId },
        name: { S: body.orgName },
        knowledgeBase: {
          S: body.knowledgeBase,
        },
        s3Uri: {
          S: `s3://${process.env.BUCKET_NAME}/organizations/${orgFolderName}`,
        },
      },
    }),
  );

  // STEP 3: Create the billing record in dynamodb
  const createBillingPromise = dynamoDBClient.send(
    new PutItemCommand({
      TableName: `${process.env.APP_NAME}-billings`,
      Item: {
        id: { S: Date.now().toString() },
        orgId: { S: body.orgId },
        startDate: {
          S: new Date().toISOString(),
        },
      },
    }),
  );

  await Promise.all([createBucketPromise, createOrganizationPromise, createBillingPromise]);

  return {
    statusCode: 201,
    body: JSON.stringify({
      message: 'Onboarding successful',
    }),
  };
};
