import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';
import type { UsdDatabaseStack } from './usd-database-stack';
import type { UsdMessagingStack } from './usd-messaging-stack';

export interface UsdComputeStackProps extends cdk.StackProps {
  readonly database: UsdDatabaseStack;
  readonly messaging: UsdMessagingStack;
}

/**
 * Shared VPC, ECS Fargate cluster, ECR repository for the API image, and ECS task IAM role.
 */
export class UsdComputeStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly cluster: ecs.Cluster;
  public readonly apiRepository: ecr.Repository;
  public readonly taskRole: iam.Role;
  public readonly taskSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: UsdComputeStackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'UsdVpc', {
      maxAzs: 2,
      natGateways: 1,
      ipAddresses: ec2.IpAddresses.cidr('10.46.0.0/16'),
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    });

    this.cluster = new ecs.Cluster(this, 'UsdCluster', {
      vpc: this.vpc,
      clusterName: 'usd-cluster',
    });

    this.apiRepository = new ecr.Repository(this, 'UsdApiRepository', {
      repositoryName: 'usd-api',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    this.taskSecurityGroup = new ec2.SecurityGroup(this, 'UsdEcsTaskSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for USD ECS Fargate tasks',
      allowAllOutbound: true,
    });

    this.taskRole = new iam.Role(this, 'UsdApiTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Task role for USD API containers',
    });

    props.database.grantTableDataAccess(this.taskRole);
    props.messaging.grantQueuesAccess(this.taskRole);

    this.taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'secretsmanager:GetSecretValue',
          'secretsmanager:DescribeSecret',
          'secretsmanager:ListSecrets',
        ],
        resources: ['*'],
      }),
    );

    this.taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
          'bedrock:ListFoundationModels',
        ],
        resources: ['*'],
      }),
    );

    this.taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ses:SendEmail', 'ses:SendRawEmail', 'ses:GetSendQuota'],
        resources: ['*'],
      }),
    );

    this.taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'es:ESHttpGet',
          'es:ESHttpPost',
          'es:ESHttpPut',
          'es:ESHttpHead',
          'es:DescribeElasticsearchDomain',
          'aoss:APIAccessAll',
        ],
        resources: ['*'],
      }),
    );
  }
}
