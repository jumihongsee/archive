const { check, validationResult } = require('express-validator');


const validateArtwork = [
    check('artworkNameKr').trim().notEmpty().withMessage('작품의 국문을 입력하세요'),
    check('artworkNameEng').trim().notEmpty().withMessage('작품의 영문을 입력하세요'),
    check('artworkMedium').trim().notEmpty().withMessage('작품의 재료를 입력하세요'),
    check('artworkMadeDate').trim().isNumeric().withMessage('작품의 제작년도를 입력하세요'),
    check('artworkSizeHeight').trim().isNumeric().withMessage('작품의 높이를 입력하세요'),
    check('artworkSizeWidth').trim().isNumeric().withMessage('작품의 넓이를 입력하세요'),
    check('saleStatus').trim().notEmpty().withMessage('판매 여부를 선택하세요'),
    check('certificationStatus').trim().notEmpty().withMessage('보증서 여부를 선택하세요'),
    check('artworkSaleStart').trim().notEmpty().withMessage('저작 시작 날짜를 입력하세요'),
    check('artworkSaleEnd').trim().notEmpty().withMessage('저작 만료 날짜를 입력하세요'),
    check('artworkPrice').trim().notEmpty().withMessage('가격을 기입하세요'),
    // 동적으로 생성되는 필드들에 대한 유효성 검사
    check('postCode').optional().trim().notEmpty().withMessage('우편번호를 입력하세요'),
    check('roadAdress').optional().trim().notEmpty().withMessage('도로명을 입력하세요'),
    check('jibunAdress').optional().trim().notEmpty().withMessage('지번주소를 입력하세요'),
    check('locationDate').optional().trim().notEmpty().withMessage('작품 위치 날짜를 입력하세요'),
    
    check('files')
    .custom((value, { req }) => {
      const files = req.files;
      const oldImg = req.body.oldImg;
      
      // 수정 페이지에서 oldImg가 있으면 검사 x
      if(oldImg && oldImg.length > 0){
        return true;
      }

      // 파일이 하나라도 있는지 검사
      if (files['file1'] || files['file2'] || files['file3'] || files['file4'] || files['file5']) {
        return true;
      }
      throw new Error('최소한 하나의 파일을 업로드해야 합니다.');
    }),

    (req,res,next)=>{        
        const errors = validationResult(req);
        if(!errors.isEmpty()){
          console.log(errors)
          return res.status(400).json({ errors: errors.array() });
        }
        next();
    }


];

module.exports = validateArtwork;