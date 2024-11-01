const { deleteS3Image } = require('../module/s3')
const { formatPhoneNumber, formatDate } = require('../module/Formatting')

async function artistData (req, res, next){

    try{
        const {
            artistnameKr,
            artistnameEng,
            artistNicknameKor, //추가  추가된 것 들 value 값 추가하기
            artistNicknameEng, //추가
            nationality, //추가
            AdressHome, // 추가
            AdressWorkPlace, //추가
            ArtistSNS, //추가
            artistDeath, //추가
            artistBirth,
            agencyRelationship, //추가
            agencyTel, //추가
            agencyEmail, //추가
            agencyEtc, //추가
            manager, //추가
            association,
            periodStart, 
            periodEnd, 
            ArtistSnsIG,
            ArtistSnsFB,
            ArtistSnsYT,
            ArtistBlog,
            artistEmail,
            artistTel,
            artistHome,
            artistNote,
            artistDescription,
    
            soloExTitle, soloExKeyword, soloExStartYear, soloExStartMonth, soloExStartDay, soloExEndYear, soloExEndMonth, soloExEndDay, soloExMemo,
            groupExTitle, groupExKeyword ,groupExStartYear, groupExStartMonth, groupExStartDay, groupExEndYear, groupExEndMonth, groupExEndDay, groupExMemo,
            awardTitle, awardDateYear, awardDateMonth, awardDateDay, awardMemo,
            educationTitle, educationDateStartYear, educationDateStartMonth, educationDateStartDay, educationDateEndYear, educationDateEndMonth, educationDateEndDay, eduMemo, grade,
            registerDate,
            register_staff,
            modify_staff
          } = req.body;
   
      
          // IMG
          // 기존 이미지 URL
          const oldImg = req.body.oldImg;

          // 등록 시간 
          // 등록시간이 이미 있으면 그 시간으로 등록
          // 등록시간이 없으면 new Date로 등록시간
      
          const registerDateValue = registerDate ? registerDate : formatDate(new Date());
          const modifyDate = modify_staff ? formatDate(new Date()) : null;
          

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

          // (추가) 작가 닉네임 배열 정리
          const artistNickName = [inputDataNull(artistNicknameKor),inputDataNull(artistNicknameEng)]

          // (추가) 작가 주소
          const adress = [inputDataNull(AdressHome),inputDataNull(AdressWorkPlace)]

          // (추가) 대리인 폼
          const agency = [inputDataNull(agencyRelationship), inputDataNull(agencyTel), inputDataNull(agencyEmail)]
          
          // (추가) 대리인 특이사항
          const agencyMemo = [{ time : formatDate(new Date()) , memo: agencyEtc }]

          // (추가) 계약기간
          const contractPeriod = [ inputDataNull(periodStart), inputDataNull(periodEnd)  ]

          // (추가) SNS

          const sns = [{
            insta :  inputDataNull(ArtistSnsIG),
            facebook : inputDataNull(ArtistSnsFB),
            youtube : inputDataNull(ArtistSnsYT),
            blog : inputDataNull(ArtistBlog)
          }]
 
          

          
       
          // let soloEx = [];
          // let groupEx = [];
          // let award = [];
        
          // 연락처 포맷 
          const formatArtistTel = formatPhoneNumber(artistTel);
          


          // 항목이 많을경우 배열의 형태로 저장된다.
          // 공백일 수 없는 항목 >> 전시 타이틀 및 학교이름
          // 텍스트를 기입하지 않으면 공백으로 저장되어 처리된다. 
          // 배열의 형태의 값으로 왔을때와 그렇지 않았을때의 포맷을

   
          

        
        

          // keyword, grade sYear , sMonth, sDay, 없을 수 있음 

          function ArrayMapping(title, keyword , grade , sYear, sMonth, sDay, eYear, eMonth, eDay, memo){ 
            console.log('배열임')
            if(Array.isArray(title)){ // title이 배열이면

              return title.map((data,i)=>{ // 배열일 경우 map을 돌려서 각 순서에 맞는 객체 배열을 만들어준다.
                
                return{
                  title : [
                    {
                      title : title[i],
                      ...(keyword ? { keyword : keyword[i] } : null),
                      ...(grade ? {  grade : grade[i] } : null)
                    }
                  ],
                  date : [
                    {
                      ...(sYear && sMonth && sDay ? {
                        start : {
                          year : sYear[i],
                          month : sMonth[i] ,
                          day : sDay[i],
                        },
                      } : null),
   
                    },
                    {
                      end : {
                        year : eYear[i] ,
                        month : eMonth[i] ,
                        day : eDay[i],
                      }    
                     
                    }
                  ],
                  memo : [
                    {
                      date : formatDate(new Date()) ,
                      memo : memo[i]
                    }
                  ]
                }

                
              }) 
            }else{ //단일 객체
              return{
                title : [
                  {
                    title : title,
                    ...(keyword ? { keyword : keyword } : null),
                    ...(grade ? {  grade : grade } : null)
                  }
                ],
                date : [
                  {
                    ...(sYear && sMonth && sDay ? {
                      start : {
                        year : sYear,
                        month : sMonth ,
                        day : sDay,
                      },
                    } : null),
 
                  },
                  {
                    end : {
                      year : eYear ,
                      month : eMonth ,
                      day : eDay,
                    }    
                   
                  }
                ],
                memo : [
                  {
                    date : formatDate(new Date()) ,
                    memo : memo
                  }
                ]
              }
            }
           
          }
                 
          // function makeArray(title, sYear, sMonth, sDay, eYear, eMonth, eDay, memo){ 

          let education = ArrayMapping(educationTitle, '', grade ,educationDateStartYear, educationDateStartMonth, educationDateStartDay, educationDateEndYear, educationDateEndMonth, educationDateEndDay, eduMemo);
          let soloEx = ArrayMapping(soloExTitle, soloExKeyword, '', soloExStartYear,soloExStartMonth, soloExStartDay, soloExEndYear, soloExEndMonth, soloExEndDay, soloExMemo);
          let groupEx = ArrayMapping( groupExTitle, groupExKeyword , '', groupExStartYear, groupExStartMonth, groupExStartDay, groupExEndYear, groupExEndMonth, groupExEndDay, groupExMemo);
          let award = ArrayMapping(awardTitle, '' , '' , ''  , '' , '', awardDateYear, awardDateMonth, awardDateDay, awardMemo )
  
         

        
          let result = {
            imgUrl: inputDataNull(insertImg), // 등록
            artistName: artistName, // 등록
            artistNickName : artistNickName , // 등록
            nationality : inputDataNull(nationality), // 등록
            agency : agency,
            soloEx: soloEx, 
            groupEx: groupEx, 
            award: award, 
            sns : sns, 
            contractPeriod : contractPeriod,
            adress : adress, // 등록
            education : education,// 등록
            agencyMemo  : agencyMemo, // 등록
            association : inputDataNull(association),
            manager :  inputDataNull(manager),
            artistBirth: inputDataNull(artistBirth), // 등록
            artistDeath : inputDataNull(artistDeath), 
            artistEmail: artistEmail ? inputDataNull(artistEmail) : null, //등록
            artistTel:  artistTel ? inputDataNull(formatArtistTel) : null , //등록
            artistHome: inputDataNull(artistHome), //등록
            ArtistSNS : inputDataNull(ArtistSNS), 
            artistNote: inputDataNull(artistNote), //등록
            artistDescription: inputDataNull(artistDescription), // 등록
            register_staff, // 등록
            registerDate : registerDateValue, //등록
            modifyDate : modifyDate, // 등록
            modify_staff, //등록
          };

          req.artistData = result;
       
          next();

    }catch(error){
        console.error('에러발생', error);
        res.status(500).send('server error')
    }

}

module.exports = artistData;