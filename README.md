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


This is a blank project for TypeScript development with CDK.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
