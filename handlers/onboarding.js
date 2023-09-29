const {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  ScanCommand,
} = require('@aws-sdk/client-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { hashPassword } = require('../helpers/hashPassword');

const dynamoDBClient = new DynamoDBClient();
const bucketClient = new S3Client();

module.exports.handler = async (event, context) => {
  try {
    const body = JSON.parse(event.body);

    validateFields(body);

    await Promise.all([checkExistence(body), verifyApiKey(body.apiKey)]);

    const { salt, hashedPassword } = hashPassword(body.password);

    const orgFolderName = body.orgName.replace(/\s/g, '_');

    // Create the s3 bucket
    const createBucketPromise = bucketClient.send(
      new PutObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: `organizations/${orgFolderName}/`,
      }),
    );

    // Create the organization record in dynamodb
    const createOrganizationPromise = dynamoDBClient.send(
      new PutItemCommand({
        TableName: `${process.env.APP_NAME}-organizations`,
        Item: {
          apiKey: { S: body.apiKey },
          id: { S: body.orgId },
          email: { S: body.email },
          orgName: { S: body.orgName },
          agentName: { S: body.agentName },
          password: { S: hashedPassword },
          salt: { S: salt },
          knowledgeBase: {
            S: body.knowledgeBase,
          },
          s3Uri: {
            S: `s3://${process.env.BUCKET_NAME}/organizations/${orgFolderName}`,
          },
        },
      }),
    );

    // Create the billing record in dynamodb
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
  } catch (error) {
    console.log('ERROR: ', error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: error.message,
      }),
    };
  }
};

const checkExistence = async ({ orgId, apiKey, email }) => {
  console.log('Checking existence...');
  const orgIdExistsPromise = dynamoDBClient.send(
    new GetItemCommand({
      TableName: `${process.env.APP_NAME}-organizations`,
      Key: {
        id: {
          S: orgId,
        },
      },
    }),
  );
  const apiKeyExistsPromise = dynamoDBClient.send(
    new ScanCommand({
      TableName: `${process.env.APP_NAME}-organizations`,
      FilterExpression: 'apiKey = :apiKey',
      ExpressionAttributeValues: {
        ':apiKey': {
          S: apiKey,
        },
      },
    }),
  );
  const emailExistsPromise = await dynamoDBClient.send(
    new ScanCommand({
      TableName: `${process.env.APP_NAME}-organizations`,
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': {
          S: email,
        },
      },
    }),
  );

  const [orgIdExists, apiKeyExists, emailExists] = await Promise.all([
    orgIdExistsPromise,
    apiKeyExistsPromise,
    emailExistsPromise,
  ]);

  if (orgIdExists.Item) {
    throw new Error('Organization ID already exists');
  }

  if (apiKeyExists.Items.length) {
    throw new Error('API Key already exists');
  }

  if (emailExists.Items.length) {
    throw new Error('Email already exists');
  }
};

const validateFields = (body) => {
  console.log('Verifying fields');
  const requiredFields = ['apiKey', 'orgId', 'orgName', 'agentName', 'email', 'password'];

  const missingFields = [];

  requiredFields.forEach((field) => {
    if (!body[field]) {
      missingFields.push(field);
    }
  });

  if (missingFields.length) {
    throw new Error(`Missing fields: ${missingFields.join(', ')}`);
  }
};

const verifyApiKey = async () => {
  console.log('Verifying API Key');
  // TODO: Verify API Key in KMS
};
