import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as ReviewsApiSentimentWorkflow from '../lib/reviews-api-sentiment-workflow-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new ReviewsApiSentimentWorkflow.ReviewsApiSentimentWorkflowStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
