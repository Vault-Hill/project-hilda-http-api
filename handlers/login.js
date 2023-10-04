const { DynamoDBClient, ScanCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { generateAccessToken } = require('../helpers/generateAccessToken');
const { generateRefreshToken } = require('../helpers/generateRefreshToken');
const { comparePasswords } = require('../helpers/comparePasswords');

module.exports.handler = async (event, context) => {
  const dynamoDBClient = new DynamoDBClient();

  const body = JSON.parse(event.body);

  console.log('BODY: ', body);

  const { email, password: plainPassword } = body;

  const { Items: organizations } = await dynamoDBClient.send(
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

  console.log('ORGANIZATION: ', organizations);

  const organization = organizations[0];

  if (!organization) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Invalid credentials',
      }),
    };
  }

  const { salt, password } = organization;

  if (!comparePasswords(plainPassword, password.S, salt.S)) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Invalid credentials',
      }),
    };
  }

  const { accessToken, expiryDate } = generateAccessToken(organization);
  const { refreshToken, expirySeconds } = generateRefreshToken(organization);
  //  Max-Age=${expirySeconds};
  const cookie = `refreshToken=${refreshToken}; HttpOnly; SameSite=Lax; Secure; Max-Age=${expirySeconds};`;

  console.log('COOKIE: ', cookie);
  await dynamoDBClient.send(
    new UpdateItemCommand({
      TableName: `${process.env.APP_NAME}-organizations`,
      Key: {
        id: {
          S: organization.id.S,
        },
      },
      UpdateExpression: 'SET refreshToken = :refreshToken',
      ExpressionAttributeValues: {
        ':refreshToken': {
          S: refreshToken,
        },
      },
    }),
  );

  return {
    statusCode: 200,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Set-Cookie': cookie,
      'Access-Control-Allow-Origin': 'https://develop.d1d66d68ewa2dw.amplifyapp.com',
      'Access-Control-Allow-Credentials': 'true',
    },
    body: JSON.stringify({
      accessExpiry: expiryDate,
      accessToken,
    }),
  };
};
