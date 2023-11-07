const { DynamoDBClient, GetItemCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { v4: uuidv4 } = require('uuid');

module.exports.handler = async (event) => {
  const body = JSON.parse(event.body);

  console.log('Body: ', body);

  const dynamoDBClient = new DynamoDBClient();

  // fetch session
  const session = await dynamoDBClient.send(
    new GetItemCommand({
      TableName: `${process.env.APP_NAME}-sessions`,
      Key: {
        id: {
          S: body.sessionId,
        },
        orgId: {
          S: body.orgId,
        },
      },
    }),
  );

  const context = JSON.parse(session.Item.context.S);
  console.log('Context: ', context);
  console.log('Last two: ', context[context.length - 2], context[context.length - 1]);

  const feedback = {
    feedback: body.feedback,
    query: context[context.length - 2]?.content || '',
    response: context[context.length - 1]?.content || '',
  };

  // add new feedback to the feedback table
  await dynamoDBClient.send(
    new PutItemCommand({
      TableName: `${process.env.APP_NAME}-feedbacks`,
      Item: {
        id: {
          S: uuidv4(),
        },
        orgId: {
          S: body.orgId,
        },
        sessionId: {
          S: body.sessionId,
        },
        feedback: {
          S: JSON.stringify(feedback),
        },
        createdAt: {
          S: new Date().toISOString(),
        },
      },
    }),
  );

  return {
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Origin': 'https://develop.d1d66d68ewa2dw.amplifyapp.com',
      'Access-Control-Allow-Credentials': 'true',
    },
    body: JSON.stringify({
      message: 'Created successful',
    }),
  };
};
