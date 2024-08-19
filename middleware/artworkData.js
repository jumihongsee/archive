const { ObjectId } = require('mongodb');
const connectDB = require('../database');

async function artworkData(req, res, next) {
    try {
        const client = await connectDB();
        const db = client.db('artworklist'); // 데이터베이스 객체를 가져옴

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
                $project: {
                    _id: 1,
                    name: 1,
                    location: 1,
                    price: 1,
                    artist: 1,
                    'artistData.name': 1
                }
            }
        ]).toArray();

        // JSON 파싱
        data.forEach(item => {
            item.location = JSON.parse(item.location);
            item.artistData[0].name = JSON.parse(item.artistData[0].name);
        });

        req.artworkData = data;
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = artworkData;