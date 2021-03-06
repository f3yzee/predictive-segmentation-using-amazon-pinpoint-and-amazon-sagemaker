const AWS = require('aws-sdk');
const readline = require('readline')
const stream = require('stream');

AWS.config.update({
    region: process.env.AWS_REGION
});

var s3 = new AWS.S3();
exports.handler = async (event) => {

    const d = new Date();
    const importFileKey = `sagemaker-bulk-transform-result/pinpoint_import-${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}.csv`;

    const readStream = s3.getObject({
        Bucket: process.env.S3_BUCKET,
        Key: event.HeadlessOutputLocation.substring(6 + process.env.S3_BUCKET.length) + '.out'
      }).createReadStream();

    const rl = readline.createInterface({input: readStream});

    var pass = new stream.PassThrough();
    const p = s3.upload({
      Bucket: process.env.S3_BUCKET,
      Key: importFileKey,
      Body: pass
    }).promise();

    let rowCount = 0;

    pass.write('Id,Attributes.ChurnScore\n');
    rl.on('line', function (line) {
      if(line.length > 0 && parseFloat(line.split(',')[1]) > parseFloat(process.env.CHURN_PREDICTION_THRESHOLD)) {
        pass.write(line + '\n');
        rowCount++;
      }
    });

    rl.on('close', function(args) {
        pass.end();
    });

    return p.then((data) => {
      return {
        ImportFile: importFileKey,
        RowCount: rowCount
      };
    });

};
