const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');

module.exports.handler = async (event, context) => {
  const body = JSON.parse(event.body);

  console.log('Body: ', body);

  const dynamoDBClient = new DynamoDBClient();

  await dynamoDBClient.send(
    new UpdateItemCommand({
      TableName: `${process.env.APP_NAME}-organizations`,
      Key: {
        id: {
          S: body.orgId,
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
    body: JSON.stringify(
      {
        message: 'Update successful',
      },
    ),
  };
};
