# Reviews API with Asynchronous Sentiment Analysis Workflow

##### Example Architecture with AppSync -> EventBridge -> Step Functions

This is a prototype application to illustrate using GraphQL mutations to invoke asynchronous workflows orchestrated by AWS Step Functions.

The application consists of a "reviews" API, where a website user can submit their thoughts about a business or product. The API is an AWS AppSync serverless GraphQL API that has the following capabilities:

- Saving a new review
- Retrieving a specific review
- Retrieving a list of reviews, by sentiment

### Sentiment Analysis Workflow

When a user calls the `putReview` mutation, the AppSync API directly invokes the EventBridge service to add an event to the event bus. This triggers a configured rule that executes the Step Functions workflow. This workflow consists of the following steps:

- Check the sentiment of the review using AWS Comprehend service
- Generate a unique ID for the review
- Save the ID, the review, and the sentiment rating in a database

---

### Diagram

![System Diagram](/diagram.png)

---

## Environment Setup

### Sign up for AWS

### Install AWS CLI

### Install AWS CDK

## Install Dependencies

```bash
npm i -S \
  @aws-cdk/aws-appsync \
  @aws-cdk/aws-dynamodb \
  @aws-cdk/aws-events \
  @aws-cdk/aws-events-targets \
  @aws-cdk/aws-iam \
  @aws-cdk/aws-lambda \
  @aws-cdk/aws-lambda-nodejs \
  @aws-cdk/aws-logs \
  @aws-cdk/aws-stepfunctions \
  @aws-cdk/aws-stepfunctions-tasks \
  aws-lambda \
  aws-sdk \
  change-case \
  dotenv \
  ulid

npm i -D \
  eslint \
  eslint-config-prettier \
  eslint-plugin-prettier \
  prettier
```

## Step Functions Sentiment Stack

### EventBridge Event Bus

Amazon EventBridge is a managed serverless event bus service used to connect applications with data from a variety of sources. EventBridge consists of 4 main features:

1. Event - Represents a change in state in your application or AWS environment
1. EventBus - Receives events from your application or AWS services
1. Rule - Matches incoming events and routes them to Targets for processing
1. Target - Processes events (e.g. Lambda/Step fns, ECS Tasks, SNS Topics, etc)

In our application, the AppSync GraphQL API will dispatch an Event when a new review is submitted. This Event matches a Rule that we will configure, and that Rule will route the event to a Target that invokes the Step Function workflow.

### Sentiment Analysis with Comprehend

Amazon Comprehend is a managed Natural Language Processing (NLP) service that evaluates text to gain insights into the content. Some of the insights that Comprehend develops about a document include:

1. Entities - Detects entities such as people, places, and locations in a document
1. Key phrases - A document about a basketball game might return key phrases such as the team names, the venue name and the score
1. PII - Analyzes documents to detect personal information that may identify an individual such as address, bank account number or phone number
1. Language - Identifies the predominant language in a document
1. Sentiment - Detects the emotional sentiment of a document (positive, negative, neutral or mixed)
1. Syntax - Parses each word in the document and determines the part of speech (e.g. nouns, verbs, adjectives, pronouns, etc)

In our application, we will use the Comprehend service to detect the sentiment of the submitted review, in order to alert a support team member about disgruntled customers.

### Generate Review ID with ULID Library

ULIDs are unique identifiers that are similar to UUIDs. They consist of two base32-encoded numbers, a UNIX timestamp (millisecond precision) and a random number. The number portion is 48 bits, and the randomness part is 80 bits.

UUIDs rely on timestamps or randomness, but ULIDs incorporate both, which provides the following properties:

- They are sortable lexicographically (alphabetically)
- Monotonically sortable (handles multiple IDs from the same millisecond)
- 26 characters compared to UUIDs 36
- Case-insensitive and URL safe

In our application, we will use a Lambda function to generate a ULID as an identifier for the review and sentiment analysis workflow.

This is a blank project for TypeScript development with CDK.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template
