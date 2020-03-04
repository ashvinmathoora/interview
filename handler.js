'use strict';
var AWS = require('aws-sdk');

var s3 = new AWS.S3({apiVersion: '2006-03-01'});


exports.hello = function(event,context,callback) {
	var today = new Date();
	var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
	var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
	var dateTime = date+' '+time;
	var stringToPrint = "Hello World on " + dateTime;
	global.bucketlist = "";


	// Call S3 to write a file
        var bucketName = process.env.S3BucketName;
        var keyName = process.env.DestFile; 
        var content = stringToPrint; 
        var params = { Bucket: bucketName, Key: keyName, Body: content };
        
        console.log("Content is: " + content);
        s3.putObject(params, function (err, data) {
                if (err)
                    console.log(err);
                else
                    console.log("Successfully saved object to " + bucketName + "/" + keyName);
        });

	// Return HTTP Response
        var response = {
                "statusCode": 200,
                "headers": {
                        "my_header": "my_value",
                        "Content-Type": "application/text-html" 
                        },
                "body": stringToPrint + "<br><br>" + "has been written to file " + keyName + " In Bucket " + bucketName ,
                "isBase64Encoded": false
        };
        callback(null, response);
};
