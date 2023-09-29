const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { authenticate } = require('../helpers/authenticate');

module.exports.handler = async (event, context) => {
  const accessToken = event.headers.Authorization.split(' ')[1];

  if (!accessToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Unauthorized',
      }),
    };
  }

  const { orgId } = await authenticate(accessToken);

  console.log('ORG ID', orgId);

  const body = JSON.parse(event.body);

  console.log('Body: ', body);

  const dynamoDBClient = new DynamoDBClient();

  await dynamoDBClient.send(
    new UpdateItemCommand({
      TableName: `${process.env.APP_NAME}-organizations`,
      Key: {
        id: {
          S: orgId,
        },
      },
      UpdateExpression: 'SET #knowledgeBase = :knowledgeBase',
      ExpressionAttributeNames: {
        '#knowledgeBase': 'knowledgeBase',
      },
      ExpressionAttributeValues: {
        ':knowledgeBase': {
          S: body.knowledgeBase,
        },
      },
    }),
  );

  return {
    statusCode: 201,
    body: JSON.stringify({
      message: 'Update successful',
    }),
  };
};
