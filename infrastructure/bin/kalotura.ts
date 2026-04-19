#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { KaloturaStack } from '../lib/kalotura-stack';

const app = new cdk.App();

new KaloturaStack(app, 'KaloturaStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'eu-west-1',
  },
  description: 'Kalotura — calorie tracking application',
});
