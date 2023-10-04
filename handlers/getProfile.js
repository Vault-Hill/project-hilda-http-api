const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { authenticate } = require('../helpers/authenticate');
const { convertResponse, formatResponse } = require('../helpers/formatResponse');

module.exports.handler = async (event, context) => {
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

  const { orgId } = await authenticate(accessToken);

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

  delete organization.password;
  delete organization.salt;

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://develop.d1d66d68ewa2dw.amplifyapp.com',
      'Access-Control-Allow-Credentials': 'true',
    },
    body: JSON.stringify({
      organization: formatResponse(organization),
    }),
  };
};
