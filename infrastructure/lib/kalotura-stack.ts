import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as apigwv2Authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as path from 'path';

export class KaloturaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ─── Cognito ───────────────────────────────────────────────────────────────
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'kalotura-users',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      userPoolClientName: 'kalotura-web',
      authFlows: { userSrp: true, userPassword: true },
      generateSecret: false,
    });

    // ─── DynamoDB ──────────────────────────────────────────────────────────────
    const table = new dynamodb.Table(this, 'Table', {
      tableName: 'kalotura-data',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });

    // ─── KMS ───────────────────────────────────────────────────────────────────
    const encryptionKey = new kms.Key(this, 'EncryptionKey', {
      description: 'Kalotura — AI API key encryption',
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ─── Lambda ────────────────────────────────────────────────────────────────
    const apiFunction = new lambdaNodejs.NodejsFunction(this, 'ApiFunction', {
      functionName: 'kalotura-api',
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '../../backend/src/index.ts'),
      // Tell CDK to resolve project root from the backend directory
      depsLockFilePath: path.join(__dirname, '../../backend/package-lock.json'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        TABLE_NAME: table.tableName,
        KMS_KEY_ID: encryptionKey.keyId,
        USER_POOL_ID: userPool.userPoolId,
        ADMIN_EMAILS: 'nenciulescu@gmail.com',
        NODE_OPTIONS: '--enable-source-maps',
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'node22',
        externalModules: ['@aws-sdk/*'],
      },
    });

    table.grantReadWriteData(apiFunction);
    encryptionKey.grantEncryptDecrypt(apiFunction);

    // ─── API Gateway HTTP API ──────────────────────────────────────────────────
    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: 'kalotura-api',
      corsPreflight: {
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.DELETE,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: ['*'],
        maxAge: cdk.Duration.days(1),
      },
    });

    const authorizer = new apigwv2Authorizers.HttpJwtAuthorizer(
      'CognitoAuthorizer',
      `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      { jwtAudience: [userPoolClient.userPoolClientId] },
    );

    const integration = new apigwv2Integrations.HttpLambdaIntegration('ApiIntegration', apiFunction);

    const routes: Array<{ method: apigwv2.HttpMethod; path: string }> = [
      { method: apigwv2.HttpMethod.GET,    path: '/profile' },
      { method: apigwv2.HttpMethod.PUT,    path: '/profile' },
      { method: apigwv2.HttpMethod.GET,    path: '/settings/ai' },
      { method: apigwv2.HttpMethod.PUT,    path: '/settings/ai' },
      { method: apigwv2.HttpMethod.GET,    path: '/entries/{date}' },
      { method: apigwv2.HttpMethod.POST,   path: '/entries' },
      { method: apigwv2.HttpMethod.GET,    path: '/entries' },
      { method: apigwv2.HttpMethod.GET,    path: '/admin/users' },
      { method: apigwv2.HttpMethod.DELETE, path: '/admin/users/{userId}' },
      { method: apigwv2.HttpMethod.PUT,    path: '/admin/users/{userId}/role' },
      { method: apigwv2.HttpMethod.PUT,    path: '/admin/users/{userId}/ai' },
    ];

    for (const r of routes) {
      httpApi.addRoutes({ path: r.path, methods: [r.method], integration, authorizer });
    }

    // ─── S3 Bucket (frontend) ─────────────────────────────────────────────────
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: `kalotura-frontend-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ─── CloudFront Function (SPA path rewriting) ──────────────────────────────
    const spaRewrite = new cloudfront.Function(this, 'SpaRewrite', {
      functionName: 'kalotura-spa-rewrite',
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var req = event.request;
  var uri = req.uri;
  if (uri.endsWith('/')) {
    req.uri = uri + 'index.html';
  } else if (!uri.includes('.')) {
    req.uri = uri + '/index.html';
  }
  return req;
}
      `.trim()),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    });

    // ─── CloudFront Distribution ───────────────────────────────────────────────
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: cloudfrontOrigins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        functionAssociations: [{
          function: spaRewrite,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        }],
      },
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.seconds(0) },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.seconds(0) },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    // ─── Deploy frontend build to S3 ──────────────────────────────────────────
    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../frontend/out'))],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // ─── Outputs ───────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'UserPoolId',       { value: userPool.userPoolId,            exportName: 'KaloturaUserPoolId' });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId, exportName: 'KaloturaUserPoolClientId' });
    new cdk.CfnOutput(this, 'ApiUrl',           { value: httpApi.url!,                   exportName: 'KaloturaApiUrl' });
    new cdk.CfnOutput(this, 'TableName',        { value: table.tableName,                exportName: 'KaloturaTableName' });
    new cdk.CfnOutput(this, 'Region',           { value: this.region,                    exportName: 'KaloturaRegion' });
    new cdk.CfnOutput(this, 'FrontendUrl',      { value: `https://${distribution.distributionDomainName}`, exportName: 'KaloturaFrontendUrl' });
  }
}
