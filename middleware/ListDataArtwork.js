const { ObjectId } = require('mongodb');
const connectDB = require('../database');

async function ArtworkListData(req, res, next) {

     try {
        const client = await connectDB();
        const db = client.db('artworklist');
        const boardId = req.params.Id || null; 
        const pageNum = parseInt(req.params.Page) || 0;
        const direction = req.query.direction;
        let pageFilter = parseInt(req.params.filter)|| 10;
        let nextDirection = true;
        let prevDirection = true;
        let nextBtnStatus = false;
        let prevBtnStatus = true;


        // 쿼리 세팅 변수
        let matchQuery = {};

        // 정렬 방법 1 : 오름차순(과거먼저) / -1: 내림차슨 (최신먼저)
        let sortDirection = 1;

    
        // 페이지 넘버를 받았는지 확인
        //direction으로 이전과 다음페이지 분할
        if(pageNum && ObjectId.isValid(boardId)){
   
            if( direction === 'prev'){
                matchQuery={_id:{$lt : new ObjectId(boardId)}}
                sortDirection = -1;
                 prevDirection = true;
                 nextDirection = false;

            }else{
                matchQuery={_id:{$gt : new ObjectId(boardId)}}
                 nextDirection = true;
                 prevDirection = false; 
            }

        }
   

        const data = await db.collection('artwork').aggregate([
            {
                $lookup: {
                    from: 'artist',
                    localField: 'artist',
                    foreignField: '_id',
                    as: 'artistData'
                },
            },

            {
                $match: matchQuery // match 조건 설정
            },
           {
                $sort: { _id: sortDirection} // _id를 기준으로 정렬 (내림차순 또는 오름차순)
            },
            {
                $limit: pageFilter    // 페이지당 5개의 결과 제한(추후 필터값부여 상이하게 할 것) + 그리고 이전과 다음페이지에 글이 있는지 확인하는 용도
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
        ]).toArray(); // 결과를 배열로 변환


        
        // (1) 이전 버튼을 눌렀을떄 첫번째 게시글 - 필터 = 0 이면 disabled 처리
        if(direction === 'prev'){
            data.reverse();
            if(pageNum - pageFilter === 0){
                console.log('이전버튼 비활성화')
                prevBtnStatus= false;
            }
        }

        // 첫번째 페이지는 무조건적으로 이전버튼이 비활성화이다.
        if(!boardId || !pageNum){
            prevBtnStatus= false;
        }

        // 또한 다음페이지가 활성화 되는지 그 여부는 조작해줘야함 
        const lastboardId = data.length > 0 ? data[data.length - 1]._id  : null;
        console.log(lastboardId)

        if(lastboardId){
            const nextboardCheck = await db.collection('artwork').findOne({_id : { $gt :  new ObjectId(lastboardId)}})
            if(nextboardCheck){
                nextBtnStatus = true;
            }
        }


        console.log()


        req.ArtworkListData = {
            data,
            nextDirection,
            prevDirection,
            nextBtnStatus,
            prevBtnStatus,
            pageFilter
        };

        
        next(); // 다음 미들웨어로
    } catch (error) {
        next(error);
    }
}

module.exports = ArtworkListData;