const { ObjectId } = require('mongodb');
const connectDB  = require('../database')


async function  ArtistSearchData(req,res,next) {

    try{

        const client = await connectDB();
        const db = client.db('artworklist');
        const boardId = req.params.Id || null;
        const pageNum = req.params.Page || 0;
        const direction = req.query.direction;
        const searchVal = req.query.val;
        const pageFilter = parseInt(req.query.filter)|| 5;
        let nextDirection = true;
        let prevDirection = false;
        let nextBtnStatus = false;
        let prevBtnStatus = true;

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
        searchData = await db.collection('artist').aggregate([
            {
                $search : {
                  index : 'artistName_index',
                  text : { query : searchVal , path : 'artistName' }
                }
            },
            {
                $match : matchQuery
            },
            {
                $sort : {_id :sortDirection }
            },
            {
                $limit :  pageFilter 
            }
        ]).toArray();

        if(!boardId || !pageNum){
            prevBtnStatus= false;
        }
        if(direction === 'prev'){
            searchData.reverse();
            if(pageNum - pageFilter === 0){
                prevBtnStatus= false;
            }
        }
        const lastboardId = searchData.length > 0 ? searchData[searchData.length - 1]._id : null;
        if(lastboardId){
            const nextboardCheck = await db.collection('artist').aggregate([
                {
                    $search : {
                        index : 'artistName_index',
                        text : { query : searchVal , path : 'artistName' }
                    }
                },
                {
                    $match: { _id: { $gt: new ObjectId(lastboardId) } },
                },
                { $limit: 1 }
            ]).toArray();

            if(nextboardCheck.length > 0){
     
                  nextBtnStatus = true;
              }
          
        }
 

     
        req.ArtistSearchData = {
            boardId,
            pageNum,
            direction,
            searchVal,
            pageFilter,
            data: searchData,
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

module.exports = ArtistSearchData;