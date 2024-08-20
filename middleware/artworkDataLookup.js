const { ObjectId } = require('mongodb');
const connectDB = require('../database');

async function artworkData(req, res, next) {
    try {
        const client = await connectDB();
        const db = client.db('artworklist'); 
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

        req.artworkData = data;
        next();
    } catch (error) {
        next(error);
    }
}


module.exports = artworkData;