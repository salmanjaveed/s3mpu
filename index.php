<?php
/* 
@deploy - Deploy to a web host as a normal php website and run on browser
@desc   - Upload bulk files to AWS S3 as Multi Part Uploads
@author - Salman Javeed
@email  - salmanjaveed@gmail.com
@company- Triolutions @ triolutions.com
@date   - 24/July/2019
*/
/*
{
    "require": {
        "aws/aws-sdk-php": "^3.55"
    }
}
*/
 
header("Access-Control-Allow-Origin: *");
require_once __DIR__."/aws/aws-autoloader.php";
// You can call the following to erase all pending multipart uploads. 
// It's a good idea to set your bucket to do this automatically (via console)
// or set this in a cronjob for every 24-48 hours
// echo abortPendingUploads(bucket());


//Setting AWS Access Key, Secret Key and Bucket Name
    function aws_key(){
        $access_key = "";
        if(isset($_COOKIE['AccessKey'])) { 
            $access_key = $_COOKIE['AccessKey'];
        }
        return $access_key;
    }
    function aws_secret(){
        $secret_key =  "";
        if(isset($_COOKIE['SecretKey'])) { 
            $secret_key = $_COOKIE['SecretKey'];
        }
         return $secret_key;
    }
    function bucket() {
        $bucket_name =  "";
       if(isset($_COOKIE['BucketName'])) { 
            $bucket_name = $_COOKIE['BucketName'];
        }
         return $bucket_name;
    }

/**
 * The key prefix in the bucket to put all uploads in
 * @return string
 */
function prefix() {
    
    $prefix =  "/";

    if(isset($_COOKIE['FolderName'])) { 
            $prefix = $_COOKIE['FolderName'];
        }
    if ($prefix) {
        if (!(substr($prefix, -1) == "/" )) {
            $prefix = $prefix . "/"; 
        }
    }
        return $prefix;
}
/**
 * Easy wrapper around S3 API
 * @param  string $command the function to call
 * @param  mixed $args    variable args to pass
 * @return mixed
 */
function s3($command=null,$args=null)
{
	static $s3=null;
	if ($s3===null)
	$s3 = new Aws\S3\S3Client([
	    'version' => 'latest',
	    'region'  => 'us-east-1',
	    'signature_version' => 'v4',
	        'credentials' => [
	        'key'    => aws_key(),
	        'secret' => aws_secret(),
	    ]
    ]);
    
	if ($command===null)
        return $s3;
	$args=func_get_args();
	array_shift($args);
	try {
		$res=call_user_func_array([$s3,$command],$args);
		return $res;
	}
	catch (AwsException $e)
	{
		echo $e->getMessage(),PHP_EOL;
	}	
	return null;
}
/**
 * Output data as json with proper header
 * @param  mixed $data
 */
function json_output($data)
{
    header('Content-Type: application/json');
    die(json_encode($data));
}
/**
 * Deletes all multipart uploads that are not completed.
 *
 * Useful to clear up the clutter from your bucket
 * You can also set the bucket to delete them every day
 * @return integer number of deleted objects
 */

function abortPendingUploads()
{
    $count=0;
    $bucket=bucket();
    $res=s3("listMultipartUploads",["Bucket"=>bucket()]);
    if (is_array($res["Uploads"]))
    foreach ($res["Uploads"] as $item)
    {

        $r=s3("abortMultipartUpload",[
            "Bucket"=>$bucket,
            "Key"=>$item["Key"],
            "UploadId"=>$item["UploadId"],
        ]);
        $count++;
    }
    return $count;
}

/**
 * Enables CORS on bucket
 *
 * This needs to be called exactly once on a bucket before browser uploads.
 * @param string $bucket 
 */

function setCORS()
{

    $client = new S3Client([
    'profile' => 'default',
    'region' => 'us-east-1',
    'version' => '2006-03-01',
	    'signature_version' => 'v4',
	        'credentials' => [
	        'key'    => aws_key(),
            'secret' => aws_secret(),
            ]
]);

try {
    $result = $client->putBucketCors([
        'Bucket' => bucket(), // REQUIRED
        'CORSConfiguration' => [ // REQUIRED
            'CORSRules' => [ // REQUIRED
                [
                    'AllowedHeaders' => ['*'],
                    'AllowedMethods' => ['POST', 'GET', 'PUT', 'HEAD'], // REQUIRED
                    'AllowedOrigins' => ['*.triolutions.com', '*'], // REQUIRED - ***CHANGE DOMAIN*** as required
                    'ExposeHeaders' => []
                ],
            ],
        ]
    ]);
   // var_dump($result);
} catch (AwsException $e) {
    // output error message if fails
    error_log($e->getMessage());
}
}

if (isset($_POST['command']))
{
	$command=$_POST['command'];
	if ($command=="create")
	{
		$res=s3("createMultipartUpload",[
			'Bucket' => bucket(),
            'Key' => prefix().$_POST['fileInfo']['name'],
            'ContentType' => $_REQUEST['fileInfo']['type'],
            'Metadata' => $_REQUEST['fileInfo']
		]);
	 	json_output(array(
               'uploadId' => $res->get('UploadId'),
                'key' => $res->get('Key'),
        ));
	}

	if ($command=="part")
	{
		$command=s3("getCommand","UploadPart",[
			'Bucket' => bucket(),
            'Key' => $_REQUEST['sendBackData']['key'],
            'UploadId' => $_REQUEST['sendBackData']['uploadId'],
            'PartNumber' => $_REQUEST['partNumber'],
            'ContentLength' => $_REQUEST['contentLength']
		]);

        // Give it at least 48 hours for very large uploads
		$request=s3("createPresignedRequest",$command,"+48 hours");
        json_output([
            'url' => (string)$request->getUri(),
        ]);		
	}

	if ($command=="complete")
	{
	 	$partsModel = s3("listParts",[
            'Bucket' => bucket(),
            'Key' => $_REQUEST['sendBackData']['key'],
            'UploadId' => $_REQUEST['sendBackData']['uploadId'],
        ]);
        $model = s3("completeMultipartUpload",[
            'Bucket' => bucket(),
            'Key' => $_REQUEST['sendBackData']['key'],
            'UploadId' => $_REQUEST['sendBackData']['uploadId'],
            'MultipartUpload' => [
            	"Parts"=>$partsModel["Parts"],
            ],
        ]);
        json_output([
            'success' => true,
            'file' => $_REQUEST['sendBackData']['key']
        ]);
	}
	if ($command=="abort")
	{
		 $model = s3("abortMultipartUpload",[
            'Bucket' => bucket(),
            'Key' => $_REQUEST['sendBackData']['key'],
            'UploadId' => $_REQUEST['sendBackData']['uploadId']
        ]);
        json_output([
            'success' => true,
            'file' => $_REQUEST['sendBackData']['key']
        ]);
    }
    if ($command=="AbortPending")
	{
		$count = abortPendingUploads();
        json_output([
            'count' => $count
        ]);
    }
    if ($command=="SetCORS")
	{
		setCORS();
        json_output([
            'success' => true
        ]);
	}

	exit(0);
}

include "upload.htm";
