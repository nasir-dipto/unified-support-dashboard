import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import type { Construct } from 'constructs';

export interface UsdCacheStackProps extends cdk.StackProps {
  readonly vpc: ec2.IVpc;
  readonly ecsTasksSecurityGroup: ec2.ISecurityGroup;
}

/**
 * ElastiCache Serverless Redis for session/cache workloads used by the API.
 */
export class UsdCacheStack extends cdk.Stack {
  public readonly cacheSecurityGroup: ec2.SecurityGroup;
  public readonly serverlessCache: elasticache.CfnServerlessCache;

  constructor(scope: Construct, id: string, props: UsdCacheStackProps) {
    super(scope, id, props);

    this.cacheSecurityGroup = new ec2.SecurityGroup(this, 'UsdRedisSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for USD ElastiCache Serverless Redis',
      allowAllOutbound: true,
    });

    this.cacheSecurityGroup.addIngressRule(
      props.ecsTasksSecurityGroup,
      ec2.Port.tcp(6379),
      'Allow Redis from ECS tasks',
    );

    const subnets = props.vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    });

    this.serverlessCache = new elasticache.CfnServerlessCache(this, 'UsdRedisServerless', {
      engine: 'redis',
      serverlessCacheName: 'usd-redis-serverless-dev',
      majorEngineVersion: '7',
      subnetIds: subnets.subnetIds,
      securityGroupIds: [this.cacheSecurityGroup.securityGroupId],
    });
  }
}
