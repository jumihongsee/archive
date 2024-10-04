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

    // imgUrl이 배열인지 확인하고, 아니라면 배열로 변환
    if (!Array.isArray(imgUrl)) {
        imgUrl = [imgUrl];  // 단일 URL을 배열로 변환
    }

    // 배열을 순회하면서 각 URL에 대해 S3 삭제 요청 수행
    const deletePromises = imgUrl.map(url => {
        if (url && typeof url === 'string') {
            let key = url.replace(`https://${bucketName}.s3.ap-northeast-2.amazonaws.com/`, '');
               // Key에 대해 디코딩 적용
               key = decodeURIComponent(key);
            return s3.send(new DeleteObjectCommand({
                Bucket: bucketName,
                Key: key
            }));
        } else {
            console.warn(`Invalid URL: ${url}`);  // 유효하지 않은 URL 경고
            return Promise.resolve();  // 유효하지 않은 URL일 경우, 삭제 시도하지 않음
        }
    });

    // 모든 삭제 작업이 완료될 때까지 기다림
    return Promise.all(deletePromises);
}

module.exports = { deleteS3Image, s3 };