const {
  SageMakerRuntimeClient,
  InvokeEndpointCommand,
} = require('@aws-sdk/client-sagemaker-runtime');
const { GetItemCommand, UpdateItemCommand, DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { authenticate } = require('../helpers/authenticate');

module.exports.handler = async (event, context) => {
  try {
    const payload = JSON.parse(event.body);

    if (!payload.authorization) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: 'Unauthorized',
        }),
      };
    }
    const { orgId } = await authenticate(payload.authorization);

    const dynamoDBClient = new DynamoDBClient();

    // get user's session from dynamoDB
    const session = await dynamoDBClient.send(
      new GetItemCommand({
        TableName: `${process.env.APP_NAME}-sessions`,
        Key: {
          id: {
            S: payload.connectionId,
          },
        },
      }),
    );

    console.log('Session', session);

    const context = JSON.parse(session.Item.context.S);

    console.log('Context', context);

    context.push({ role: 'user', content: payload.data.message });

    console.log('Prompt Input', context);

    const prompts = {
      inputs: [context],
      parameters: { max_new_tokens: 256, top_p: 0.3, temperature: 0.3 },
    };

    const sagemakerClient = new SageMakerRuntimeClient();

    const response = await sagemakerClient.send(
      new InvokeEndpointCommand({
        EndpointName: process.env.MODEL_ENDPOINT_NAME,
        ContentType: 'application/json',
        Accept: 'application/json',
        Body: JSON.stringify(prompts),
        CustomAttributes: 'accept_eula=true',
      }),
    );

    const message = JSON.parse(new TextDecoder('utf-8').decode(response.Body))[0].generation
      .content;

    context.push({ role: 'assistant', content: message });

    await dynamoDBClient.send(
      new UpdateItemCommand({
        TableName: `${process.env.APP_NAME}-sessions`,
        Key: {
          id: {
            S: payload.connectionId,
          },
        },
        UpdateExpression: 'SET #context = :context',
        ExpressionAttributeNames: {
          '#context': 'context',
        },
        ExpressionAttributeValues: {
          ':context': {
            S: JSON.stringify(context),
          },
        },
      }),
    );

    const generatedResponse = {
      action: 'prompt',
      orgId: orgId,
      sessionId: payload.connectionId,
      agentName: payload.agentName,
      sessionTtl: Math.floor(Date.now() / 1000) + 60 * 3,
      data: {
        totalDislikes: payload.totalDislikes,
        role: 'assistant',
        message,
        timestamp: new Date().toISOString(),
      },
    };

    return {
      statusCode: 200,
      body: JSON.stringify(generatedResponse),
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
