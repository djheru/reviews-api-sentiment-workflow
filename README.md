# Reviews API with Asynchronous Sentiment Analysis Workflow

### [View the Accompanying Slideshow](https://docs.google.com/presentation/d/1m6Os6w9oc7nm9RUmxRRG9r7Uo4J1wvgckgq_Cr6jKbI/present?usp=sharing)

---

#### Example Architecture with AppSync -> EventBridge -> Step Functions

This is a prototype application to illustrate using GraphQL mutations to invoke asynchronous workflows orchestrated by AWS Step Functions.

The application consists of a "reviews" API, where a website user can submit their thoughts about a business or product. The API is an AWS AppSync serverless GraphQL API that has the following capabilities:

- Saving a new review
- Retrieving a specific review
- Retrieving a list of reviews, by sentiment

## Sentiment Analysis Workflow

When a user calls the `putReview` mutation, the AppSync API directly invokes the EventBridge service to add an event to the event bus. This triggers a configured rule that executes the Step Functions workflow. This workflow consists of the following steps:

- Check the sentiment of the review using AWS Comprehend service
- Generate a unique ID for the review
- Save the ID, the review, and the sentiment rating in a database
- If the review sentiment is negative, send a notification email to a configured account

---

## Diagram

![System Diagram](/diagram.png)

---

# Environment Setup

This project assumes you have a reasonably recent version of Node.js and related tools.

## Sign up for AWS

This project is based around AWS managed services, so as you might expect, you will need an account.

This article provides a detailed walkthrough of signing up for a new AWS account:
[How do I create and activate a new AWS account?](https://aws.amazon.com/premiumsupport/knowledge-center/create-and-activate-aws-account/)

You will also want to ensure that you have environment variables set for the AWS region and your account ID. The CDK CLI will read them and use them as defaults for the deployment.

```bash
export AWS_DEFAULT_REGION=us-east-1
export AWS_DEFAULT_ACCOUNT=XXXXXXXXXXXX # ENTER YOUR AWS ACCOUNT NUMBER
```

## Install AWS CLI

It's a good idea to have the AWS CLI installed. Here is a resource with instructions geared to your environment/platform: [Installing the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)

## Install AWS CDK

The CDK toolkit is the foundation of this project, so you will definitely need it installed: [Getting started with the AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html)

## Install EventBridge CLI

While not strictly necessary, the `eventbridge-cli` tool is very useful while working with EventBridge. It allows you to publish events or tail the events coming in on a given event bus, plus much more. It can be installed using the instructions here: [Github spezam/eventbridge-cli](https://github.com/spezam/eventbridge-cli)

## Clone the Repository

```bash

git clone git@github.com:djheru/reviews-api-sentiment-workflow.git
cd reviews-api-sentiment-workflow

```

## Install Node Dependencies

```bash
# Install AWS CDK
npm i -g aws-cdk

# Install Node dependencies
npm install

# Create environment config
cp .env.example .env
nano .env
# Make sure to pdate the email sender and recipient
# fields with the real address
```

As mentioned below, you will also need to verify the email address with AWS. To do so, you will need to log into your AWS console, navigate to [the SES management page -> Email Addresses ](https://console.aws.amazon.com/ses/home?region=us-east-1#verified-senders-email:) and select "Verify a New Email Address".

Once you submit the email, AWS will send you a verification email. Click the link in that email and you'll be all set!

---

# Deployment

## Transpile the Typescript to JavaScript

```bash
npm run build
```

## Build the AWS Templates and Assets

```bash
cdk synth
```

## Deploy the CloudFormation Stack(s)

```bash
cdk deploy --all
```

---

# Step Functions Sentiment Stack

## EventBridge Event Bus

Amazon EventBridge is a managed serverless event bus service used to connect applications with data from a variety of sources. EventBridge consists of 4 main features:

1. Event - Represents a change in state in your application or AWS environment
1. EventBus - Receives events from your application or AWS services
1. Rule - Matches incoming events and routes them to Targets for processing
1. Target - Processes events (e.g. Lambda/Step fns, ECS Tasks, SNS Topics, etc)

In our application, the AppSync GraphQL API will dispatch an Event when a new review is submitted. This Event matches a Rule that we will configure, and that Rule will route the event to a Target that invokes the Step Function workflow.

### Tailing EventBridge Events Using `eventbridge-cli`

```bash
eventbridge-cli --eventbusname ReviewsEventBus
```

## Sentiment Analysis with Comprehend

Amazon Comprehend is a managed Natural Language Processing (NLP) service that evaluates text to gain insights into the content. Some of the insights that Comprehend develops about a document include:

1. Entities - Detects entities such as people, places, and locations in a document
1. Key phrases - A document about a basketball game might return key phrases such as the team names, the venue name and the score
1. PII - Analyzes documents to detect personal information that may identify an individual such as address, bank account number or phone number
1. Language - Identifies the predominant language in a document
1. Sentiment - Detects the emotional sentiment of a document (positive, negative, neutral or mixed)
1. Syntax - Parses each word in the document and determines the part of speech (e.g. nouns, verbs, adjectives, pronouns, etc)

In our application, we will use the Comprehend service to detect the sentiment of the submitted review, in order to alert a support team member about disgruntled customers.

## Generate Review ID with ULID Library

ULIDs are unique identifiers that are similar to UUIDs. They consist of two base32-encoded numbers, a UNIX timestamp (millisecond precision) and a random number. The number portion is 48 bits, and the randomness part is 80 bits.

UUIDs rely on timestamps or randomness, but ULIDs incorporate both, which provides the following properties:

- They are sortable lexicographically (alphabetically)
- Monotonically sortable (handles multiple IDs from the same millisecond)
- 26 characters compared to UUIDs 36
- Case-insensitive and URL safe

In our application, we will use a Lambda function to generate a ULID as an identifier for the review and sentiment analysis workflow.

## Save Data in DynamoDB Directly from Step Function

AWS Step Functions have the ability to directly invoke several other AWS services, without needing to use a user-provided Lambda or other compute. For example, Step Functions can include a task that performs such actions as:

- Triggering a CodeBuild job
- Calling an API Gateway endpoint
- Running an ECS Task
- Creating an SQS message or SNS notification
- Triggering a separate Step Function
- Placing an EventBridge event on the event bus
- CRUD operations on DynamoDB records

In our application, we will use Step Functions tasks to write the review, sentiment, and ID to a DynamoDB table.

The Table's partition key will be the review ID, and it will contain attributes storing the review text and the sentiment value (POSITIVE, NEGATIVE, NEUTRAL, MIXED)

The Table will also include a GSI (Global Secondary Index) that uses the sentiment value as the partition key. This is possible because GSIs do not require that the partition key be a unique value. This allows us to support "get reviews by sentiment" searches, which we will be using in the GraphQL queries

## Send Email Notifications for Negative Reviews

Amazon Simple Email Service (SES) is a managed email platform allows you to send and receive email using your own email addresses and domains. This service allows you to use a managed email service with features like the following:

- Send emails using the AWS SDK or direct calls to the SES API
- Integrated notifications with SNS for bounced emails
- Store received emails in S3
- Trigger Lambda functions from email received events

For our application, we will be sending an email to a single configured email address whenever there is a review with negative sentiment posted through the API. This requires us to first add the email address to the SES console and verify our control of it. Once the email address is verified, we can use SES to send emails on our behalf.

## Orchestrate Workflows with Step Functions

Amazon Step Functions is a workflow service used to orchestrate AWS services, automate business processes and build serverless applications. Workflows manage failures, retries, parallelization, service integrations and observability.

For our application, we will be using Step Functions to manage the following 4 tasks:

1. Detect the sentiment of the submitted review
1. Generate an identifier for the request
1. Save the review and sentiment in a database
1. Send an email to support if the sentiment is negative

---

# GraphQL Reviews API Stack

## Serverless GraphQL API with AppSync

AWS AppSync is a managed service to help develop GraphQL APIs by connecting to data sources such as the following:

- DynamoDB
- Lambda
- AWS RDS
- External HTTP endpoints

In our application, we will be implementing one mutation, to save the review, and two queries, to retrieve a single review or a list of reviews by sentiment.

## AppSync / EventBridge Direct Integration

AWS exposes the EventBridge service as an HTTP API, so we can add events by making requests to the service from a GraphQL mutation resolver. When a reviews API user wants to post a new review, they will make a GraphQL `putReview` mutation request.

Typically, you would store some data in a database in response to a GraphQL mutation, but in this case we are performing a `PutEvent` request on the EventBridge API.

To define the shape of the request and response objects, we're using Velocity mapping templates. These are defined in `./templates/put-review-request.vtl` and `./templates/put-review-response.vtl`

## Example GraphQL Queries

```graphql
mutation PutReviewMutation($value: String!) {
  putReview(reviewText: $value) {
    FailedEntries
    Entries {
      ErrorCode
      ErrorMessage
      EventId
    }
  }
}

query GetReviewsBySentimentQuery($value: SENTIMENT!) {
  getReviewsBySentiment(sentiment: $value) {
    customerMessage
    reviewId
    sentiment
  }
}

query GetReviewQuery($value: String!) {
  getReview(reviewId: $value) {
    reviewId
    customerMessage
    sentiment
  }
}
```

---

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template

---

## References

- Inspiration for this project: https://dev.to/ryands17/sentiment-analysis-with-step-functions-using-the-cdk-4n1h
- EventBridge introduction: https://serverlessland.com/learn/eventbridge
- Invoking AWS services using AppSync: https://iamjkahn.com/2019/12/invoking-even-more-aws-services-directly-from-aws-appsync.html
- Example pattern - AppSync to EventBridge: https://serverlessland.com/patterns/appsync-eventbridge-cdk
- Example pattern - EventBridge to Step Functions: https://serverlessland.com/patterns/eventbridge-sfn
- Velocity template mapping reference: https://docs.aws.amazon.com/appsync/latest/devguide/resolver-mapping-template-reference-programming-guide.html
- AWS CDK Documentation
  - Getting Started: https://docs.aws.amazon.com/cdk/latest/guide/home.html
  - AppSync: https://docs.aws.amazon.com/cdk/api/latest/docs/aws-appsync-readme.html
  - EventBridge: https://docs.aws.amazon.com/cdk/api/latest/docs/aws-events-readme.html
  - EventBridge Targets: https://docs.aws.amazon.com/cdk/api/latest/docs/aws-events-targets-readme.html
  - Step Functions: https://docs.aws.amazon.com/cdk/api/latest/docs/aws-stepfunctions-readme.html
  - Step Function Tasks: https://docs.aws.amazon.com/cdk/api/latest/docs/aws-stepfunctions-tasks-readme.html
  - Node.js Lambda Functions: https://docs.aws.amazon.com/cdk/api/latest/docs/aws-lambda-nodejs-readme.html
  - DynamoDB: https://docs.aws.amazon.com/cdk/api/latest/docs/aws-dynamodb-readme.html

---

## Destroy the Stack

```
cdk destroy
```
