function deleteS3Image(imgUrl){
    const bucketName = process.env.BUCKET_NAME;
    const key = imgUrl.split(`${bucketName}/`)[1];
  
    return s3.deleteObject({
        Bucket: bucketName,
        Key: key
    }).promise();
  
  }
  module.exports = { deleteS3Image };