import { AttributeType, BillingMode, Table } from '@aws-cdk/aws-dynamodb';
import { EventBus } from '@aws-cdk/aws-events';
import { Effect, PolicyStatement } from '@aws-cdk/aws-iam';
import { Runtime } from '@aws-cdk/aws-lambda';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { RetentionDays } from '@aws-cdk/aws-logs';
import { JsonPath } from '@aws-cdk/aws-stepfunctions';
import {
  DynamoAttributeValue,
  DynamoPutItem,
  LambdaInvoke,
} from '@aws-cdk/aws-stepfunctions-tasks';
import { Construct, RemovalPolicy, Stack, StackProps } from '@aws-cdk/core';
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

  // DynamoDB table to store reviews with the sentiment value
  public reviewsTable: Table;

  // Step Function task to save the data in DynamoDB
  public saveReviewTask: DynamoPutItem;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.id = id;
    this.buildResources();
  }

  buildResources() {
    this.buildEventBus();
    this.buildSentimentLambda();
    this.buildIdGeneratorLambda();
    this.buildReviewsTable();
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

  /**
   * Sets up a DynamoDB table to store the review/sentiment and a Step Functions task
   * to write the data directly, without requiring a Lambda function
   */
  buildReviewsTable() {
    const tableId = pascalCase(`${this.id}-review-table`);
    const indexId = pascalCase(`${this.id}-review-sentiment-index`);
    const taskId = pascalCase(`${this.id}-save-review-task`);

    // Create a table for the data
    // Use the ULID as the partition key
    this.reviewsTable = new Table(this, tableId, {
      tableName: REVIEWS_TABLE_NAME,
      partitionKey: {
        name: 'reviewId',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Add a GSI to the table, to search by sentiment
    this.reviewsTable.addGlobalSecondaryIndex({
      indexName: indexId,
      partitionKey: {
        name: 'sentiment',
        type: AttributeType.STRING,
      },
    });

    // Configure the task to allow Step Functions to directly
    // call the DynamoDB HTTP API and invoke a PutItem request
    this.saveReviewTask = new DynamoPutItem(this, taskId, {
      table: this.reviewsTable,
      item: {
        reviewId: DynamoAttributeValue.fromString(
          // The return value of the ID generator lambda is wrapped in a "Payload" property
          JsonPath.stringAt('$.reviewId.Payload')
        ),
        customerMessage: DynamoAttributeValue.fromString(
          // This comes directly from the EventBridge event
          JsonPath.stringAt('$.detail.reviewText')
        ),
        sentiment: DynamoAttributeValue.fromString(
          // The return value of the sentiment lambda is an object  wrapped in a "Payload"
          // property. We only want the "Sentiment" field off this object
          JsonPath.stringAt('$.sentimentResult.Payload.Sentiment')
        ),
      },
      resultPath: '$.reviewDataRecord',
    });
  }
}
