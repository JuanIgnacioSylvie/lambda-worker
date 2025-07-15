let SQSClient, SendMessageCommand;
try {
  ({ SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs'));
} catch (err) {
  console.warn('AWS SDK not available, queue messages will be skipped');
}

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
const sqs = SQSClient ? new SQSClient({ region }) : null;
const QueueUrl = process.env.SQS_QUEUE_URL;

async function sendMessage(payload, delaySeconds = 0) {
  if (!sqs || !QueueUrl) {
    console.warn('SQS_QUEUE_URL not configured, skipping send');
    return;
  }
  const params = {
    QueueUrl,
    MessageBody: JSON.stringify(payload),
    DelaySeconds: delaySeconds,
  };
  await sqs.send(new SendMessageCommand(params));
}

module.exports = { sendMessage };
