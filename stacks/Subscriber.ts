import {Function, StackContext, Table} from "sst/constructs";
import {RemovalPolicy} from "aws-cdk-lib";
import {Alias} from "aws-cdk-lib/aws-lambda";
export function Subscriber({stack, app}: StackContext) {

    app.setDefaultRemovalPolicy(RemovalPolicy.DESTROY);

    const ddb = new Table(stack, "CloudWatchSubscriptionLambda", {
        fields: {
            id: "string",
        },
        primaryIndex: {partitionKey: "id"},
        stream: "new_image",
    });

    const fun = new Function(
        stack, 'LambdaReportFunction',
        {
            bind: [ddb],
            functionName: `CloudWatchSubscription-${app.stage}`,
            handler: "packages/functions/src/lambda_report.handler",
            currentVersionOptions: {
                provisionedConcurrentExecutions: 5,
            },
        });

    const alias = new Alias(stack, "DdbApiFunctionAlias", {
        aliasName: "live",
        version: fun.currentVersion,
    });

    stack.addOutputs({
        functionName: alias.functionName,
    });

}
