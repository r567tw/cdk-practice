import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda'
import { Vpc } from '@aws-cdk/aws-ec2';
import * as stepfunction from '@aws-cdk/aws-stepfunctions'
import * as tasks from '@aws-cdk/aws-stepfunctions-tasks';

export class CdkLambdaStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    const Defaultvpc = Vpc.fromLookup(this, 'default', { isDefault: true })
    // https://stackoverflow.com/questions/62442651/aws-cdk-how-do-i-associate-a-specified-version-of-lambda-with-an-alias
    // The code that defines your stack goes here
    const callStepFunction = new lambda.Function(this, 'callStepFunctionExample', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/callStepFunction'),
      functionName: 'callStepFunctionExample',
      timeout: cdk.Duration.seconds(5),
      vpc: Defaultvpc,
      allowPublicSubnet: true,
      environment: {
        'node_env': 'test'
      }
    });
    const callStepFunctionDev = callStepFunction.currentVersion;
    callStepFunctionDev.addAlias('dev')

    // const prodVersion = lambda.Version.fromVersionArn(this, 'prodVersion', `${fnDemo.functionArn}:1`);
    // prodVersion.addAlias('production');

    // const stgVersion = lambda.Version.fromVersionArn(this, 'stgVersion', `${fnDemo.functionArn}:2`);
    // stgVersion.addAlias('staging');

    // const hello = tasks.LambdaInvoke

    const getSalary = new lambda.Function(this, 'getSalary', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/getSalary'),
      functionName: 'getSalary'
    });

    const salaryJob = new tasks.LambdaInvoke(this, 'salaryJob', {
      lambdaFunction: getSalary,
      resultPath: '$.lambdaResult',
    })

    const getDeposit = new lambda.Function(this, ' getDeposit', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/getDeposit'),
      functionName: 'getDeposit'
    })

    const depositJob = new tasks.LambdaInvoke(this, 'depositJob', {
      lambdaFunction: getDeposit,
      inputPath: '$.lambdaResult.Payload',
      resultPath: '$.result'
    })

    const success = new stepfunction.Succeed(this, 'buy m1')
    const error = new stepfunction.Fail(this, 'not enough')

    const schema = salaryJob
      .next(new stepfunction.Wait(this, 'wait 3 seconds', {
        time: stepfunction.WaitTime.duration(cdk.Duration.seconds(3))
      }))
      .next(depositJob)
      .next(new stepfunction.Choice(this, 'Can I buy m1 ?')
        .when(stepfunction.Condition.stringEquals('$.result.Payload', 'rich'), success)
        .otherwise(error)
      )

    new stepfunction.StateMachine(this, 'ExampleStateMachine', {
      definition: schema,
      stateMachineName: 'ExampleStateMachine',
      // stateMachineType: stepfunction.StateMachineType.EXPRESS,
      timeout: cdk.Duration.minutes(3)
    })


  }
}
