import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class PropTechStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ===========================================
    // LAMBDA EXECUTION ROLE
    // ===========================================
    
    const lambdaRole = new iam.Role(this, 'PropTechLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        BedrockPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // ===========================================
    // LAMBDA FUNCTION (Container from CDK-managed image)
    // ===========================================
    
    const lambdaFunction = new lambda.DockerImageFunction(this, 'PropTechApiFunction', {
      code: lambda.DockerImageCode.fromImageAsset('.', {
        platform: ecr_assets.Platform.LINUX_AMD64,
      }),
      role: lambdaRole,
      memorySize: 3008,
      timeout: cdk.Duration.minutes(15),
      environment: {
        ALGOLIA_APPLICATION_ID: process.env.ALGOLIA_APPLICATION_ID || '',
        ALGOLIA_SEARCH_API_KEY: process.env.ALGOLIA_SEARCH_API_KEY || '',
        ALGOLIA_ADMIN_API_KEY: process.env.ALGOLIA_ADMIN_API_KEY || '',
        NODE_ENV: 'production',
      },
      architecture: lambda.Architecture.X86_64,
    });

    // ===========================================
    // API GATEWAY
    // ===========================================
    
    const api = new apigateway.RestApi(this, 'PropTechApi', {
      restApiName: 'PropTech AI Platform API',
      description: 'API for PropTech AI Platform - Pure CDK Deployment',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'Cache-Control',
          'Pragma',
          'Expires',
        ],
      },
    });

    // Lambda integration
    const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
    });

    // API routes
    api.root.addMethod('ANY', lambdaIntegration);
    api.root.addProxy({
      defaultIntegration: lambdaIntegration,
      anyMethod: true,
    });

    // ===========================================
    // S3 FRONTEND HOSTING (Fixed Configuration)
    // ===========================================
    
    const frontendBucket = new s3.Bucket(this, 'PropTechFrontendBucket', {
      bucketName: `proptech-frontend-${this.account}-${this.region}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    // Deploy frontend to S3
    const frontendDeployment = new s3deploy.BucketDeployment(this, 'PropTechFrontendDeployment', {
      sources: [s3deploy.Source.asset('./frontend/build')],
      destinationBucket: frontendBucket,
      prune: true,
    });

    // Create config.json for frontend
    const configDeployment = new s3deploy.BucketDeployment(this, 'PropTechConfigDeployment', {
      sources: [
        s3deploy.Source.jsonData('config.json', {
          apiUrl: api.url.replace(/\/$/, ''), // Remove trailing slash
          deploymentType: 'pure-cdk',
          version: '1.0.0',
        }),
      ],
      destinationBucket: frontendBucket,
      prune: false,
    });

    // ===========================================
    // OUTPUTS
    // ===========================================
    
    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: lambdaFunction.functionName,
      description: 'Lambda function name',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: frontendBucket.bucketWebsiteUrl,
      description: 'Frontend website URL',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'Frontend S3 bucket name',
    });
  }
}
