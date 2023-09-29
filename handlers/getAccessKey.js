const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../helpers/authenticate');
const cryptoJs = require('crypto-js');

module.exports.handler = async (event) => {
  const authorization = event.headers.Authorization ?? event.headers.authorization ?? '';
  const accessToken = authorization.split(' ')[1];

  if (!accessToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Unauthorized',
      }),
    };
  }

  const { orgId } = authenticate(accessToken);

  console.log('ORG ID: ', orgId);

  if (!orgId) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Unauthorized',
      }),
    };
  }

  const dynamoDBClient = new DynamoDBClient();

  const { Item: organization } = await dynamoDBClient.send(
    new GetItemCommand({
      TableName: `${process.env.APP_NAME}-organizations`,
      Key: {
        id: {
          S: orgId,
        },
      },
    }),
  );

  const payload = {
    orgId: organization.id.S,
    agentName: organization.agentName.S,
  };

  if (organization.logoUrl) {
    payload.logoUrl = organization.logoUrl.S;
  }

  // encrypt payload with cryptoJs
  const encryptedPayload = cryptoJs.AES.encrypt(
    JSON.stringify(payload),
    process.env.ACCESS_KEY_ENCRYPT_KEY,
  ).toString();

  const accessKey = jwt.sign({ payload: encryptedPayload }, process.env.ACCESS_KEY_SECRET, {
    issuer: 'Vault Hill',
    audience: `${organization.orgName.S} customers`,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      accessKey,
    }),
  };
};
