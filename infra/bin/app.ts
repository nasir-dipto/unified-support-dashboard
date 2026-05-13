#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { UsdCacheStack } from '../lib/usd-cache-stack';
import { UsdComputeStack } from '../lib/usd-compute-stack';
import { UsdDatabaseStack } from '../lib/usd-database-stack';
import { UsdMessagingStack } from '../lib/usd-messaging-stack';

/**
 * Applies standard USD cost and ownership tags to every stack.
 */
function applyUsdTags(stack: cdk.Stack): void {
  cdk.Tags.of(stack).add('Project', 'usd');
  cdk.Tags.of(stack).add('Environment', 'dev');
}

/**
 * Seeds CDK context so `ec2.Vpc` synthesis does not call EC2 DescribeAvailabilityZones
 * (required for CI and workstations without EC2 describe permissions).
 */
function seedAvailabilityZoneContext(app: cdk.App, account: string, region: string): void {
  app.node.setContext(`availability-zones:account=${account}:region=${region}`, [
    `${region}a`,
    `${region}b`,
    `${region}c`,
  ]);
}

const app = new cdk.App();

const account =
  process.env.CDK_DEFAULT_ACCOUNT ?? process.env.AWS_ACCOUNT_ID ?? '000000000000';
const region =
  process.env.CDK_DEFAULT_REGION ?? process.env.AWS_REGION ?? 'us-east-1';

seedAvailabilityZoneContext(app, account, region);

const env: cdk.Environment = { account, region };

const database = new UsdDatabaseStack(app, 'UsdDatabase', { env });
applyUsdTags(database);

const messaging = new UsdMessagingStack(app, 'UsdMessaging', { env });
applyUsdTags(messaging);

const compute = new UsdComputeStack(app, 'UsdCompute', {
  env,
  database,
  messaging,
});
applyUsdTags(compute);

const cache = new UsdCacheStack(app, 'UsdCache', {
  env,
  vpc: compute.vpc,
  ecsTasksSecurityGroup: compute.taskSecurityGroup,
});
applyUsdTags(cache);

app.synth();
