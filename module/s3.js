// s3.js
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
    region: 'ap-northeast-2',
    credentials: {
        accessKeyId: process.env.IAM_ACCESS,
        secretAccessKey: process.env.IAM_SECRET_KEY
    }
 
});


function deleteS3Image(imgUrl) {
    const bucketName = process.env.BUCKET_NAME;
    const key = imgUrl.replace(`https://${bucketName}.s3.ap-northeast-2.amazonaws.com/`, '');


    return s3.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key
    }));
}

module.exports = { deleteS3Image, s3 };