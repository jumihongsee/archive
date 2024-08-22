const { deleteS3Image } = require('../server');
const { formatPhoneNumber, formatDate } = require('../module/Formatting')

async function artistData (req, res, next){

    try{


        let imgUrl = null;
        if(req.file){
            imgUrl = req.file.location;

            // 기존 이미지 url 가져오기
            const oldImgUrl = req.body.oldImg || null;

            if (oldImgUrl) {
                // 기존 이미지 삭제
                await deleteS3Image(oldImgUrl);
            }
        }

        const {
            artistnameKr,
            artistnameEng,
            artistBirth,
            artistEmail,
            artistTel,
            artistHome,
            artistNote,
            artistDescription,
            soloExDate,
            soloExTitle,
            groupExDate,
            groupExTitle,
            awardExDate,
            awardTitle,
            EducationDate,
            EducationTitle
    
          } = req.body;
        
          // 값이 있는지 검사하는 변수
          const inputDataNull = (value) => value === '' ? null : value;
        
          // 작가 이름 배열 정리 
          const artistName = [inputDataNull(artistnameKr), inputDataNull(artistnameEng)];
          let education = [];
          let soloEx = [];
          let groupEx = [];
          let award = [];
        
          // 연락처 포맷 
          const formatArtistTel = formatPhoneNumber(artistTel);
          
    
          // 개인전 배열 처리
          if (Array.isArray(soloExDate) && Array.isArray(soloExTitle)) {
            soloEx = soloExDate.map((date, i) => ({
              date: inputDataNull(date),
              exTitle: inputDataNull(soloExTitle[i])
            }));
          } 
        
          // 그룹전 배열 처리
          if (Array.isArray(groupExDate) && Array.isArray(groupExTitle)) {
            groupEx = groupExDate.map((date, i) => ({
              date: inputDataNull(date),
              exTitle: inputDataNull(groupExTitle[i])
            }));
          } 
          
        
          // 수상 배열 처리
          if (Array.isArray(awardExDate) && Array.isArray(awardTitle)) {
            award = awardExDate.map((date, i) => ({
              date: inputDataNull(date),
              exTitle: inputDataNull(awardTitle[i])
            }));
          }
    
          // 학력 배열 처리
          if(Array.isArray(EducationDate) && Array.isArray(EducationTitle)){
            education = EducationDate.map((date, i)=>({
              date : inputDataNull(date),
              school : inputDataNull(EducationTitle[i])
            }))
          }
        
      
        
          let result = {
            imgUrl: inputDataNull(imgUrl),
            artistName: artistName,
            soloEx: soloEx,
            groupEx: groupEx,
            award: award,
            education : education,
            artistBirth: inputDataNull(artistBirth),
            artistEmail: inputDataNull(artistEmail),
            artistTel: inputDataNull(formatArtistTel),
            artistHome: inputDataNull(artistHome),
            artistNote: inputDataNull(artistNote),
            artistDescription: inputDataNull(artistDescription),
            registerDate : formatDate(new Date())
         
          };

          req.artistData = result;

          next();

    }catch(error){
        console.error('에러발생', error);
        res.status(500).send('server error')
    }

}

module.exports = artistData;