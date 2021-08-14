import { FieldLogLevel, GraphqlApi, Schema } from '@aws-cdk/aws-appsync';
import { Table } from '@aws-cdk/aws-dynamodb';
import { EventBus } from '@aws-cdk/aws-events';
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from '@aws-cdk/aws-iam';
import { Construct, Stack, StackProps } from '@aws-cdk/core';
import { pascalCase } from 'change-case';
import { join } from 'path';

export interface ReviewsApiStackProps extends StackProps {
  table: Table;
  eventBus: EventBus;
}

export class ReviewsApiStack extends Stack {
  public id: string;

  // A reference to the DynamoDB table created in the other stack and passed in via props
  public reviewsTable: Table;

  // A reference to the EventBus created in the other stack and passed in via props
  public reviewsEventBus: EventBus;

  // The AppSync GraphQL API
  public reviewsApi: GraphqlApi;

  constructor(scope: Construct, id: string, props: ReviewsApiStackProps) {
    super(scope, id, props);

    this.id = id;
    this.reviewsTable = props.table;
    this.reviewsEventBus = props.eventBus;

    this.buildResources();
  }

  buildResources() {
    this.buildApi();
    this.buildEventBridgeRole();
  }

  /**
   * Sets up the GraphQL API, using the schema referenced in the listed file
   */
  buildApi() {
    const apiId = pascalCase(`${this.id}-api`);
    this.reviewsApi = new GraphqlApi(this, apiId, {
      name: apiId,
      schema: Schema.fromAsset(
        join(__dirname, '..', 'graphql', 'schema.graphql')
      ),
      // Enable AWS managed tracing with XRay
      xrayEnabled: true,
      logConfig: {
        excludeVerboseContent: false,
        fieldLogLevel: FieldLogLevel.ALL,
      },
    });
  }

  /**
   * Assign permissions to the AppSync role to allow it to authenticate via IAM
   * when invoking the PutEvent method on the EventBridge API
   */
  buildEventBridgeRole() {
    const roleId = pascalCase(`${this.id}-appsync-eventbridge-role`);
    const allowEventbridge = new Role(this, roleId, {
      assumedBy: new ServicePrincipal('appsync.amazonaws.com'),
    });
    allowEventbridge.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: ['*'],
        actions: ['events:PutEvents'],
      })
    );
  }
}
