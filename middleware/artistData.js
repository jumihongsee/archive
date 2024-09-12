const { deleteS3Image } = require('../module/s3')
const { formatPhoneNumber, formatDate } = require('../module/Formatting')

async function artistData (req, res, next){

    try{
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
            EducationTitle,
            registerDate
          } = req.body;

          // IMG
          // 기존 이미지 URL
          const oldImg = req.body.oldImg;

          // 등록 시간 
          // 등록시간이 이미 있으면 그 시간으로 등록
          //등록시간이 없으면 new Date로 등록시간
      
          const registerDateValue = registerDate ? registerDate : formatDate(new Date());

          
          // 새이미지
          // 등록 파일이 있다? 그럼 새 파일 저장소를 가져와
          // 등록 파일이 없다?  : 아니면 이전 이미지 값 다시 넣어줘
          const insertImg = req.file ? req.file.location : oldImg;

          if(req.file){ // 새 파일이 등록됐쎔
            // 그럼 기존 이미지 없애
            if(oldImg){
                try{
                  await deleteS3Image(oldImg);
                  console.log('기존에 남아있던 이미지 삭제함')
                }catch(error){
                  console.error('삭제 못했음 ㅈㅅ;' + error)
                }
            }
          }
        
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
            imgUrl: inputDataNull(insertImg),
            artistName: artistName,
            soloEx: soloEx,
            groupEx: groupEx,
            award: award,
            education : education,
            artistBirth: inputDataNull(artistBirth),
            artistEmail: artistEmail ? inputDataNull(artistEmail) : null,
            artistTel:  artistTel ? inputDataNull(formatArtistTel) : null ,
            artistHome: inputDataNull(artistHome),
            artistNote: inputDataNull(artistNote),
            artistDescription: inputDataNull(artistDescription),
            registerDate : registerDateValue,
            createtDate :new Date()
         
          };

          req.artistData = result;

          next();

    }catch(error){
        console.error('에러발생', error);
        res.status(500).send('server error')
    }

}

module.exports = artistData;