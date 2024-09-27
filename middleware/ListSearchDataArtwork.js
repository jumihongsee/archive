const { ObjectId } = require('mongodb');
const connectDB = require('../database');

async function ArtworkSearchData(req,res,next){

    try{

        // url은 두가지 타입이다.
        // /search/artwork?val='검색어'&filter='페이지필터'
        // /search/artwork?val='검색어'&filter='페이지필터'/:Id/:page?direction='방향'

        const client = await connectDB();
        const db = client.db('artworklist');
        // 두 라우터의 차이점은 Id값과 page와  direction
    
        const boardId = req.params.Id || null;
        const pageNum = req.params.Page || 0;
        const direction = req.query.direction;

        const searchVal = req.query.val;

        
        const pageFilter = parseInt(req.query.filter)|| 5;


        let nextDirection = true;
        let prevDirection = false;
        let nextBtnStatus = false;
        let prevBtnStatus = true;

        // 쿼리 세팅
        let matchQuery = {};
        let sortDirection = 1;

      

        if(pageNum && ObjectId.isValid(boardId)){
            if(direction === 'prev'){
                matchQuery = {_id : {$lt : new ObjectId(boardId)}}
                sortDirection = -1;
                prevDirection = true;
                nextDirection = false;
            }else{
                matchQuery = {_id: {$gt : new ObjectId(boardId)}}
                prevDirection = false;
                nextDirection = true;
            }
        }
        

        let searchData = []
      

        searchData = await db.collection('artwork').aggregate([
            {
              $search: {
                // 아트워크의 이름과 아티스트의 이름 
                index: 'artwork_name',
                text: { 
                  query: searchVal, 
                  path: ['name', 'artistName'] 

                }
              }
            },
            {
                $match : matchQuery
            },
            {
                $sort : {_id :sortDirection }
            },
            {
              $lookup: {
                from: 'artist', // artist 컬렉션과 조인
                localField: 'artist',
                foreignField: '_id',
                as: 'artistData'
              }
            },
            {
                $limit :  pageFilter 
            },
            {
              $project: {
                imgUrl: 1,
                location: 1,
                name: 1,
                size: 1,
                price: 1,
                copyRight: 1,
                registerDate: 1,
                medium: 1,
                madeDate: 1,
                sale: 1,
                certification: 1,
                'artistData.artistName': 1,
                'artistData._id': 1
              }
            }
          ]).toArray();


        //버튼 설정 : 이전 버튼
        if(!boardId || !pageNum){
            prevBtnStatus= false;
        }
        if(direction === 'prev'){
            searchData.reverse();
            if(pageNum - pageFilter === 0){
                prevBtnStatus= false;
            }
        }

        // 버튼 설정 : 다음 버튼
        const lastboardId = searchData.length > 0 ? searchData[searchData.length - 1]._id : null;
        if(lastboardId){
            //const nextboardCheck = await db.collection('artwork').findOne({_id : {$gt : new ObjectId(lastboardId)}})
            const nextboardCheck = await db.collection('artwork').aggregate([
              {
                $search : {
                  index: 'artwork_name',
                  text: { query: searchVal, path:  ['name', 'artistName']  },
                }
              },
              {
                $match: { _id: { $gt: new ObjectId(lastboardId) } },  // lastboardId 이후의 데이터
            },
            { $limit: 1 }
            ]).toArray();

            if(nextboardCheck.length > 0){
              console.log(nextBtnStatus)
                nextBtnStatus = true;
            }
        }

                
        
        req.ArtworkSearchData = {
            boardId,
            pageNum,
            direction,
            searchVal,
            pageFilter,
            data : searchData,
            nextDirection,
            prevDirection,
            nextBtnStatus,
            prevBtnStatus,
        }

        next()
    }catch(error){

        next(error)
    }

}

module.exports = ArtworkSearchData;