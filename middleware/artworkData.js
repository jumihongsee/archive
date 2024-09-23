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
            artistName,
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


        const imgUrl = Array(5).fill(null);  // 5개의 이미지 URL을 담을 배열을 null로 초기화 안그러면 따움표가 두번 저장됨 
        const oldImg = Array.isArray(req.body.oldImg) ? req.body.oldImg : [req.body.oldImg]; // 배열 변환 작업 
        const imgStatus = Array.isArray(req.body.ImgStatus) ? req.body.ImgStatus : [req.body.ImgStatus];




        //새로운 이미지 저장 
        // 각 파일을 돌면서 상태 확인
        for(let i = 0; i < imgUrl.length; i++){

            const fileNumber = `file${i+1}` // 총 file1 - file5가 있음 번호 부여

            // [0] 새로운 이미지가 있을 경우 
            if(req.files[fileNumber]){
                imgUrl[i] = req.files[fileNumber][0].location; // 새이미지가 저장된 위치를 해당 imgUrl 배열 위치에 등록해 놓음 
            }

            // [1] 기존 이미지가 있을 경우 
            if(oldImg[i] && imgStatus[i] === 'full'){
                imgUrl[i] = oldImg[i] //기존 이미지는 내버려둔다
            }


            // [3] 이미지 삭제하기
            if(oldImg[i] && imgStatus[i] === 'delete'){
                await deleteS3Image(oldImg[i]);
                imgUrl[i] = null;
            }


            // ** 기존 이미지가 삭제된 경우 + 새로운 이미지를 추가 한 경우
            //old 이미지를 없앤다!!!!!!!!!!!!!!!!!!!!!!!!
            //새로운 이미지를 추가한다!!!!!!!!!!!

            if(oldImg[i] && imgStatus[i] === 'modify'){
                await deleteS3Image(oldImg[i]);
                console.log('수정쓰')

            }

          
        }


        //최종 데이터 설정
        req.data = {
            artist: new ObjectId(artistId),
            artistName : artistName,
            imgUrl: imgUrl,  // 여기서 imgUrl 대신 finalImgUrl을 사용
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