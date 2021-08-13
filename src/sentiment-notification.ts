import { SESV2 } from 'aws-sdk';

const {
  AWS_REGION: region,
  RECIPIENT: recipient = '',
  SENDER: FromEmailAddress = '',
} = process.env;

const ses = new SESV2({ region });

export const handler = async (event: any) => {
  try {
    console.log('negativeSentimentNotification: %j', event);
    const message = `
      Sentiment analysis: ${event.sentimentResult.Payload.Sentiment}
      Customer Review: ${event.detail.reviewText}
    `;
    await ses
      .sendEmail({
        FromEmailAddress,
        Destination: {
          ToAddresses: [recipient],
        },
        Content: {
          Simple: {
            Subject: {
              Charset: 'UTF-8',
              Data: 'Negative sentiment customer review',
            },
            Body: {
              Text: {
                Charset: 'UTF-8',
                Data: message,
              },
            },
          },
        },
      })
      .promise();
    return {
      body: 'Notification submitted successfully!',
    };
  } catch (e) {
    console.error(e);
    throw e;
  }
};
