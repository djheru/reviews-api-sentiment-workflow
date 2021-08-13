import { EventBus } from '@aws-cdk/aws-events';
import { Effect, PolicyStatement } from '@aws-cdk/aws-iam';
import { Runtime } from '@aws-cdk/aws-lambda';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { RetentionDays } from '@aws-cdk/aws-logs';
import { LambdaInvoke } from '@aws-cdk/aws-stepfunctions-tasks';
import { Construct, Stack, StackProps } from '@aws-cdk/core';
import { pascalCase } from 'change-case';
import * as dotenv from 'dotenv';

dotenv.config();

const {
  SENDER = '',
  RECIPIENT = '',
  REVIEWS_EVENT_BUS_NAME = '',
  REVIEWS_TABLE_NAME = '',
} = process.env;

export class ReviewsApiSentimentWorkflowStack extends Stack {
  public id: string;

  // The event bus uses configured rules to invoke the Step Function workflow
  // when a new review is submitted
  public reviewsEventBus: EventBus;

  // Step Function task to detect review sentiment
  public detectSentimentTask: LambdaInvoke;

  // Step Function task to generate the ULID for the transaction
  public generateUlidTask: LambdaInvoke;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.id = id;
    this.buildResources();
  }

  buildResources() {
    this.buildEventBus();
    this.buildSentimentLambda();
    this.buildIdGeneratorLambda();
  }

  /**
   * Creates a new EventBus using the name configured in the .env file or
   * environment variable
   */
  buildEventBus() {
    const id = pascalCase(`${this.id}-event-bus`);
    this.reviewsEventBus = new EventBus(this, id, {
      eventBusName: REVIEWS_EVENT_BUS_NAME,
    });
  }

  /**
   * Sets up a lambda function that uses the SDK to query the Comprehend API
   * regarding the sentiment of the submitted review. This lambda is invoked
   * as part of the Step Functions workflow
   */
  buildSentimentLambda() {
    const lambdaId = pascalCase(`${this.id}-sentiment-lambda`);
    const taskId = pascalCase(`${this.id}-sentiment-task`);

    // Lambda function to query Comprehend
    const sentimentLambda = new NodejsFunction(this, lambdaId, {
      functionName: lambdaId,
      runtime: Runtime.NODEJS_12_X,
      entry: 'src/detect-sentiment.ts',
      handler: 'handler',
      memorySize: 256,
      logRetention: RetentionDays.ONE_MONTH,
      bundling: {
        nodeModules: ['aws-sdk'],
        externalModules: [],
      },
    });

    // Grant permission to the lambda
    const allowComprehend = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['comprehend:DetectSentiment'],
      resources: ['*'],
    });
    sentimentLambda.addToRolePolicy(allowComprehend);

    // Use lambda as a Step Function Task
    this.detectSentimentTask = new LambdaInvoke(this, taskId, {
      lambdaFunction: sentimentLambda,
      // "$" represents the root of the JSON document the Step Function carries as its state
      resultPath: '$.sentimentResult',
    });
  }

  /**
   * Sets up a lambda function that uses the ulid library to generate a new ID
   * for the review and sentiment analysis record
   */
  buildIdGeneratorLambda() {
    const lambdaId = pascalCase(`${this.id}-ulid-lambda`);
    const taskId = pascalCase(`${this.id}-ulid-task`);

    // Lambda function to generate ID
    const idGeneratorLambda = new NodejsFunction(this, lambdaId, {
      functionName: lambdaId,
      runtime: Runtime.NODEJS_12_X,
      entry: 'src/generate-id.ts',
      handler: 'handler',
      memorySize: 128,
      logRetention: RetentionDays.ONE_MONTH,
      bundling: {
        nodeModules: ['aws-sdk', 'ulid'],
        externalModules: [],
      },
    });

    // Use lambda as a Step Function Task
    this.generateUlidTask = new LambdaInvoke(this, taskId, {
      lambdaFunction: idGeneratorLambda,
      // "$" represents the root of the JSON document the Step Function carries as its state
      resultPath: '$.reviewId',
    });
  }
}
