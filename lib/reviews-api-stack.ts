import { Table } from '@aws-cdk/aws-dynamodb';
import { EventBus } from '@aws-cdk/aws-events';
import { Construct, Stack, StackProps } from '@aws-cdk/core';

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

  constructor(scope: Construct, id: string, props: ReviewsApiStackProps) {
    super(scope, id, props);

    this.id = id;
    this.reviewsTable = props.table;
    this.reviewsEventBus = props.eventBus;

    this.buildResources();
  }

  buildResources() {}
}
