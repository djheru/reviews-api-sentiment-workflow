#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ReviewsApiSentimentWorkflowStack } from '../lib/reviews-api-sentiment-workflow-stack';
import { ReviewsApiStack } from '../lib/reviews-api-stack';

const description = `An example "reviews" API using asynchronous workflows triggered by an AWS AppSync GraphQL mutation which directly invokes EventBridge to start an asynchronous workflow orchestrated by Step Functions for the purpose of determining the sentiment of the review and notifying a support team member for negative reviews.`;
const app = new cdk.App();
const workflow = new ReviewsApiSentimentWorkflowStack(app, 'ReviewsWorkflow');
new ReviewsApiStack(app, 'ReviewsApi', {
  description,
  eventBus: workflow.reviewsEventBus,
  table: workflow.reviewsTable,
});
