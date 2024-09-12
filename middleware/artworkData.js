const { ObjectId } = require('mongodb');
const { deleteS3Image } = require('../module/s3');
const { formatPrice, formatDate } = require('../module/Formatting')

async function artworkData(req, res, next) {
    
    try {
        const {
            artworkNameKr,
            artworkNameEng,
            artworkMedium,
            artworkMadeDate,
            artworkSizeHeight,
            artworkSizeWidth,
            artworkSizeDepth,
            postCode,
            roadAdress,
            jibunAdress,
            extraAddress,
            detailAddress,
            locationDate,
            saleStatus,
            certificationStatus,
            artworkSaleStart,
            artworkSaleEnd,
            artistId,
            artworkPrice,
            registerDate,
        } = req.body;

        const inputDataNull = (value) => value === '' ? null : value;

        // 작품 이름 배열 처리
        const artworkName = [inputDataNull(artworkNameKr), inputDataNull(artworkNameEng)];

        // 작품 사이즈 배열 처리
        const artworkSize = [inputDataNull(artworkSizeHeight), inputDataNull(artworkSizeWidth), inputDataNull(artworkSizeDepth)];

        // 저작기간 배열 정리
        const artworkCopyRight = [inputDataNull(artworkSaleStart), inputDataNull(artworkSaleEnd)];

        // 등록 시간 
        // 등록시간이 이미 있으면 그 시간으로 등록
        //등록시간이 없으면 new Date로 등록시간
    
        const registerDateValue = registerDate ? registerDate : formatDate(new Date());


        // 위치 배열 처리
        let location;
        if (Array.isArray(postCode) && Array.isArray(roadAdress) &&
            Array.isArray(extraAddress) && Array.isArray(detailAddress) &&
            Array.isArray(locationDate) && Array.isArray(jibunAdress)) {
            location = locationDate.map((date, i) => {
                return {
                    date: new Date(inputDataNull(date)),
                    postCode: postCode[i],
                    road: roadAdress[i],
                    jibun: jibunAdress[i],
                    extra: extraAddress[i],
                    detail: detailAddress[i],
                    location_Jibun: jibunAdress[i],
                };
            });
        } else {
            location = [{
                date: new Date(inputDataNull(locationDate)),
                postCode: postCode,
                road: roadAdress,
                jibun: jibunAdress,
                extra: extraAddress,
                detail: detailAddress,
                location_Jibun: jibunAdress
            }];
        }

        location.sort((a, b) => a.date - b.date);


        const imgUrl = Array(5).fill(null);  // 5개의 이미지 URL을 담을 배열을 null로 초기화
        const oldImg = Array.isArray(req.body.oldImg) ? req.body.oldImg : [req.body.oldImg];

        for (let i = 0; i < 5; i++) {
            const fileNum = `file${i + 1}`;

            // 새로 업로드된 파일이 있는 경우
            if (req.files && req.files[fileNum] && req.files[fileNum][0]) {
                imgUrl[i] = req.files[fileNum][0].location;

                // 기존 이미지가 있는 경우
                if (oldImg[i]) {
                    try {
                        await deleteS3Image(oldImg[i]);
                        console.log(`기존 이미지 ${oldImg[i]} 삭제됨`);
                    } catch (error) {
                        console.error(`기존 이미지 삭제 실패: ${error}`);
                    }
                }
            } else if (oldImg[i] === null) {
                // oldImg가 null인 경우 해당 이미지 삭제
                imgUrl[i] = null;

                if (req.body[`oldImg${i + 1}`]) {
                    try {
                        await deleteS3Image(req.body[`oldImg${i + 1}`]);
                        console.log(`기존 이미지 ${req.body[`oldImg${i + 1}`]} 삭제됨`);
                    } catch (error) {
                        console.error(`기존 이미지 삭제 실패: ${error}`);
                    }
                }
            } else {
                // 새로 업로드된 파일이 없고, oldImg도 null이 아닌 경우 기존 이미지 유지
                imgUrl[i] = oldImg[i];
            }
        }

        console.log(imgUrl);
        // null 값을 필터링하여 실제 이미지 경로만 남김
        const finalImgUrl = imgUrl.filter(img => img !== null);

        // 최종 데이터 설정
        req.data = {
            artist: new ObjectId(artistId),
            imgUrl: finalImgUrl,  // 여기서 imgUrl 대신 finalImgUrl을 사용
            location: location,
            name: artworkName,
            size: artworkSize,
            price: formatPrice(artworkPrice),
            copyRight: artworkCopyRight,
            registerDate: registerDateValue ,
            medium: artworkMedium,
            madeDate: artworkMadeDate,
            sale: saleStatus,
            certification: certificationStatus,
        };

        next();
    } catch (error) {
        next(error);
    }
}

module.exports = artworkData;