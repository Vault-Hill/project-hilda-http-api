module.exports.formatResponse = (response) => {
  const convertedResponse = {};

  for (const key in response) {
    if (Object.hasOwnProperty.call(response, key)) {
      const value = response[key];

      if (value.hasOwnProperty('S')) {
        convertedResponse[key] = value['S'];
      } else if (value.hasOwnProperty('N')) {
        convertedResponse[key] = Number(value['N']);
      } else if (value.hasOwnProperty('BOOL')) {
        convertedResponse[key] = value['BOOL'];
      } else if (value.hasOwnProperty('M')) {
        convertedResponse[key] = formatResponse(value['M']);
      } else if (value.hasOwnProperty('L')) {
        convertedResponse[key] = value['L'].map((item) => formatResponse(item));
      }
    }
  }

  return convertedResponse;
};
