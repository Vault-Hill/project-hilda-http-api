const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');

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

  delete organization.apiKey;
  delete organization.password;
  delete organization.salt;

  return {
    statusCode: 200,
    body: JSON.stringify({
      organization,
    }),
  };
};
