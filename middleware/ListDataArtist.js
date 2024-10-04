const { ObjectId } = require('mongodb');
const connectDB = require('../database')

async function ArtistListData (req,res,next){

    try{
        
        const client = await connectDB();
        const db = client.db('artworklist');
        const pageNum = parseInt(req.params.Page) || 0;
        const boardId = req.params.Id;
        const direction = req.query.direction;

        let nextDirection = true; 
        let prevDirection = false;
        let nextBtnStatus = false;
        let prevBtnStatus = true;
        let pageFilter = parseInt(req.params.filter) || 5;



          // 클라이언트 url에서 pageNum을 받아와야함
          // 클라이언트 url에서 boardId를 받아와야함
          // 클라이언트 url에서 버튼의 direction 값을 가져와야함

 
            
            // matchQuery 설정
            let matchQuery = {}
            let sortDirection = -1;
            // pageNum이 있으며, boardId가 유효한 아이디 일때 matchQuery 설정을 해줘야함
            if(pageNum && ObjectId.isValid(boardId)){
                // 이전 버튼을 눌렀을때는 리스트를 찾을때 boardId(게시글의 첫번째값) lt를 활용하여 이전의 값을 가져와야함 ,sort의 방향을 반대로 -1 , direction 의 불린 값을 설정
                // 다음 버튼을 눌렀을때는 리스트를 찾을때 boardId (게시글의 마지막값) gt를 활용하여 다음의 값을 가져와야함  , direction 의 불린 값을 설정
                if(direction === 'prev'){
                    matchQuery = {_id:{$gt: new ObjectId(boardId)}}
                    sortDirection = 1;
                    prevDirection = true;
                    nextDirection = false;
                }else{
                    matchQuery = {_id :{$lt : new ObjectId(boardId)}}
                    prevDirection = false;
                    nextDirection = true;
                }
            }
           
           
            

            // aggregate를 활용하여 상단의 값들을 필터링하여 가져온다.
            let data = await db.collection('artist').aggregate([
                {$match : matchQuery},
                {$sort : {_id : sortDirection}},
                // limit값은 pageFilter를 통해 클라이언트측에서 url로 받아온 필터옵션값을 가져온다
                {$limit : pageFilter},


            ]).toArray()
    

            // 버튼의 활성화 유무 체크
            // 첫번째 페이지는 무조건 이전버튼을 비활성화 해준다.
            if(!boardId || !pageNum){
                prevBtnStatus= false;
            }
            // 이전버튼을 눌렀을때 게시글 - 필터 = 0 dlaus disabled 이전에 값이 없다는 뜻이다 
            if(direction === 'prev'){
                // 순서 바뀌어서 list 다시 송출 
                data.reverse();
                if(pageNum - pageFilter === 0){
                    prevBtnStatus= false;
                }
            }

            console.log(pageNum)
            console.log(pageFilter)

            // 다음 버튼을 눌렀을때 
            // 게시글의 마지막 id값을 가져와서 그 다음의 값이 있는지 확인해줘야한다. 있으면 true 없으면 false(button disabled)
            const lastboardId = data.length > 0 ? data[data.length - 1]._id  : null;
            console.log(lastboardId)
    
            if(lastboardId){
                const nextboardCheck = await db.collection('artist').findOne({_id : { $lt:  new ObjectId(lastboardId)}})
                if(nextboardCheck){
                    nextBtnStatus = true;
                 
                }
            }
            

            req.ArtistListData = {
                data,
                nextDirection,
                prevDirection,
                nextBtnStatus,
                prevBtnStatus,
                pageFilter
            }


            next()
        }catch(error){
            next(error)
        }

}

module.exports = ArtistListData;