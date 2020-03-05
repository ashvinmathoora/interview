# INTERVIEW TECH TEST

Interviewee: Ashvin Mathoora
Test: Write a string to a text file in an S3 Bucket via an API call

## Introduction

This outlines setting up and the thought process behind this basic serverless nodejs lambda

## Thought process
Based on the requirements:

The first attempt at learning and implementing this went along the lines of a basic nodejs setup on a local laptop, running tests by using a full admin aws access key and invoking the function locally. I then used that same access key to test s3 bucket creation and cloudformation creation via a live sls deploy. 

During the learning process, I worked to figure out how to return an appropriate response to the user how to write from nodejs to an S3 bucket.
I chose to simply pull in the whole aws-sdk rather than just the aws/client/s3 module, purely out of convenience.

I noticed the default lambda spun up was using 1024MB of memory, and the task is small so dropped the memorySize down to 256, it could work with 128 though.

Once this was working, I added a Lambda Role so that it only had restricted access to the S3 bucket and basic execution rights. 

I moved onto implementing the CircleCI config using a specific circleci user with it's own access key, to start with using a full access aws key. As I've not used CircleCI before I spent some time trial and erroring through how the config file works and trying to figure out if I needed orbs. I decided to keep it simple.  

Once I had that process down, I created a specific circleci iam policy to reduce privileges and assigned this to the user, I also created a role for this and attached that same policy to it. For the purposes of this task I chose not to do an assume role step for the circleci user and just attach the iam policy directly to it, just to speed up the build time for thisi and not need aws cli tools or write another bit of javascript. In a more sensible approach I'd have had the circleci user with no policy, and have it assume the CircleCI Role to execute the sls deploy, this config is in the cloudformation/user.yml file should you wish to view it.

If I were to do this i'd have executed something like the following as a step before deployment:
```
STSKEY=(aws sts assume-role --role-arn "arn:aws:iam::<AccountID>:role/InterviewASMCircleCIPipelineUserRole" --role-session-name circleci-deploy --duration-seconds 3600 --query '[Credentials.AccessKeyId,Credentials.SecretAccessKey,Credentials.SessionToken]' --output 'text')
export AWS_ACCESS_KEY_ID='{SYSKEY[0]}'
export AWS_SECRET_ACCESS_KEY='{SYSKEY[1]}' 
export AWS_SESSION_TOKEN='{SYSKEY[2]}'
export AWS_SECURITY_TOKEN=${SYSKEY[2]}
``` 
this would have been called from a bash script in the bin dir to keep the circleci config file clean.

I then moved onto creating a more parameterized version of the serverless.yml file and the handler.js file to make it more generic and easier to update, as well as trying to figure out how to reference cloudformation resource stack details within serverless.yml. This allowed the conf/lambda.yml file to control variables and pass them through serverless.yml to the helloWorld function. 

## SETUP

Update the conf/lambda.yml file and the cloudformation/user.parameters file to include the bucket name to write to, it is currently set to interview-bucket-asm as I figure this is not going to be taken anywhere

Update conf/lambda.yml to have a new version number

There are two ways from here:
1. If you already have aws access keys in circleci with sufficient privileges, and already have linked circleci to the repo, just commit the changes made and this will deploy the lambda

2. If you don't already have an aws access key in circleci for this follow the below:
```
cd cloudformation
aws cloudformation validate-template --template-body file://user.yaml
aws cloudformation create-stack --stack-name InterviewASMCircleCIPipelineUser --template-body file://user.yml --parameters file://user.parameters --capabilities CAPABILITY_NAMED_IAM
```

This will create an InterviewASMCircleCIPipelineUser , and store it's access key and secret key in Secrets Manager under Secret Name InterviewASMCircleCIPipelineUserSecretKey

acquire the AWS Access Key and Secret Key from this and configure circleci with these credentials to access aws, and then commit an update to the repoif it has already been linked to circleci.

There should be enough privileges to deploy and setup the api gateway/lambda and s3 buckets.

## CLEAN UP

```
aws s3 rm s3://interview-bucket-asm/hello.txt
sls remove 
aws cloudformation delete-stack --stack-name InterviewASMCircleCIPipelineUser
```

## Observations

1. the lambda was running with 1024MB of ram , dropped down to 256 , could have run on 128
2. the documentation outlining how to get cloudformation variables into the serverless.yml main body is sketchy and older config seems to have used plugins.
3. when a bucket is not empty or you rerun with previous errors it can mess up the deploy in various ways, that require deleting everything and emptying buckets to get it back to a normal state to redeploy.
4. It's possible to further lock down the circleci iam user policy, but for this task wasn't worth the effort 
5. I've not chosen a specific deploymentBucket name, but have set it to not be publicly accessible, by default it seems to have public access enabled.
6. during a sls remove, if the destination bucket still has hello.txt in it it doesn't complete properly, the bucket has to be empty for it to work otherwise you have to manually delete the stack 
7. I could have added a sls <action> parameter to pass at run time so it could do conditional deploy/remove. 
8. During the build process, as the destination bucket hasn't been created the local test still passes as it gets a 200 response from running the localambda, but fails to write to the bucket for that first interation, could swap this to execute post deploy, or run a non local sls invoke to the actual deployed lambda.
