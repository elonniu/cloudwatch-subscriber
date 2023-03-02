import * as zlib from "zlib";
import {Table} from "sst/node/table";
import {DynamoDB} from "aws-sdk";

export async function handler(event: Object, context: Object, callback: CallableFunction) {

    // if it's from CloudWatch Subscription filters
    if (event.awslogs) {
        let lists = [];
        let payload = Buffer.from(event.awslogs.data, 'base64');

        event.awslogs = JSON.parse(zlib.gunzipSync(payload));

        const {logGroup, logStream, logEvents} = event.awslogs;

        for (let i in logEvents) {
            let {id, timestamp, message} = logEvents[i];
            let RequestId = getNum(message, 'RequestId:', 'Duration');
            let Duration = getNum(message, 'Duration:', 'ms');
            let MemorySize = getNum(message, 'Memory Size:', 'MB');
            let MaxMemoryUsed = getNum(message, 'Max Memory Used:', 'MB');
            let InitDuration = getNum(message, 'Init Duration:', 'ms');
            let BilledDuration = getNum(message, 'Billed Duration:', 'ms');
            let RestoreDuration = getNum(message, 'Restore Duration:', 'ms');
            let BilledRestoreDuration = getNum(message, 'Billed Restore Duration:', 'ms');
            let XRAYTraceId = getNum(message, 'XRAY TraceId:', 'SegmentId');
            let SegmentId = getNum(message, 'SegmentId:', 'Sampled');
            let Sampled = getNum(message, 'Sampled:', '');

            const Item = {
                id,
                logGroup,
                logStream,
                timestamp,
                RequestId,
                Duration,
                MemorySize,
                MaxMemoryUsed,
                InitDuration,
                BilledDuration,
                RestoreDuration,
                BilledRestoreDuration,
                XRAYTraceId,
                SegmentId,
                Sampled
            };

            lists.push({
                PutRequest: {
                    Item
                }
            });

        }

        await putItems(Table.CloudWatchSubscriptionLambda.tableName, lists);
    }


    return {}
}

function getNum(str, firstStr, secondStr) {
    if (str == "" || str == null || str == undefined) { // "",null,undefined
        return "";
    }

    if (str.indexOf(firstStr) < 0) {
        return "";
    }

    var subFirstStr = str.substring(str.indexOf(firstStr) + firstStr.length, str.length);
    var subSecondStr = subFirstStr.substring(0, subFirstStr.indexOf(secondStr));
    subSecondStr = subSecondStr.replaceAll('\t', '')
        .replaceAll(' ', '');

    return subSecondStr;
}


export async function putItems(table, list) {

    const batch = 25;

    let items = [];

    for (let i in list) {
        items.push(list[i]);
        if (items.length === batch) {
            await put(table, items);
            items = [];
        }
    }

    await put(table, items);
}

export async function put(table, items) {

    if (items.length === 0) {
        return;
    }

    console.log(JSON.stringify({table, items}, null, "  "));

    const params = {
        RequestItems: {
            [table]: items
        },
    };

    const dynamoDb = new DynamoDB.DocumentClient();

    const res = await dynamoDb.batchWrite(params, function (err, data) {
        if (err) {
            console.log({table, error: err});
            return err;
        }

        console.log({table, succeed: data});
        return data;
    });

    console.log(await res.promise());

}
