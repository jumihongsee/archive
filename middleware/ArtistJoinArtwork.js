const { ObjectId } = require('mongodb');
const connectDB = require('../database');

async function ArtworkJoinArtist(req, res, next) { 
    try {
        const client = await connectDB();
        const db = client.db('artworklist'); 
        const data = await db.collection('artwork').aggregate([
            {
                $lookup: {
                    from: 'artist', // 비교할 다른 컬렉션 이름 
                    localField: 'artist',// 현재 컬렉션에서 조인에 사용할 필드 
                    foreignField: '_id',  // 'artwork' 컬렉션에서 비교할 필드
                    as: 'artistData' // 조인된 결과를 저장할 필드 이름
                },
            },
            {
                $project: {
                    imgUrl : 1,
                    location : 1,
                    name : 1,
                    size : 1,
                    price : 1,
                    copyRight : 1,
                    registerDate :1,
                    medium: 1,
                    madeDate: 1,
                    sale : 1,
                    certification : 1,
                    'artistData.artistName': 1
                }
            }
        ]).toArray();

        // JSON 파싱
        data.forEach(item => {
            // item.location이 정의되어 있고 유효한 JSON일 경우에만 파싱
            if (item.location) {
                try {
                    item.location = JSON.parse(item.location);
                } catch (parseError) {
                    console.error(`Error parsing location: ${parseError.message}`);
                }
            }

            // item.artistData가 존재하고 이름이 정의되어 있고 유효한 JSON일 경우에만 파싱
            if (item.artistData && item.artistData[0] && item.artistData[0].name) {
                try {
                    item.artistData[0].name = JSON.parse(item.artistData[0].name);
                } catch (parseError) {
                    console.error(`Error parsing artist name: ${parseError.message}`);
                }
            }
        });

        req.ArtworkJoinArtist = data;
        next();
    } catch (error) {
        next(error);
    }
}


module.exports =  ArtworkJoinArtist;