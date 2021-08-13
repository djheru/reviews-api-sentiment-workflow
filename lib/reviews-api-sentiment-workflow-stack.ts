import { EventBus } from '@aws-cdk/aws-events';
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

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.id = id;
    this.buildResources();
  }

  buildResources() {
    this.buildEventBus();
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
}
