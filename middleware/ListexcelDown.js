const ExcelJS = require('exceljs');
const connectDB = require('../database');

async function excelListDown(req, res) {
    try {
        // (1) /admin/list/download/:ListType'
        const listType = req.params.ListType;
        const client = await connectDB();
        const db = client.db(`artworklist`);
        let searchVal = req.query.search;

        // 데이터 불러오기
        let data;
        if (searchVal) {
            if (listType === 'artwork') {
                // artwork 리스트의 searchVal로 검색
                data = await db.collection(listType).aggregate([
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
                    $sort : {_id :1}
                }
              ]).toArray();

            } else if (listType === 'artist') {
              data = await db.collection(listType).aggregate([
                {
                  $search : {
                    index : 'artistName_index',
                    text : { query : searchVal , path : 'artistName' }
                  }
                },
                {
                    $sort : {_id :1}
                }
              ]).toArray();
            }
        } else {
            // searchVal이 없으면 전체 데이터 가져오기
            data = await db.collection(listType).find().toArray();
        }

        // Excel 워크북 및 시트 생성
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(`${listType} - 리스트`, {
            views: [
                { state: 'frozen', xSplit: 1, ySplit: 1 } // 첫 행 고정
            ]
        });

        let columns = [];
        let rowData = [];

        // artwork 또는 artist에 따라 컬럼과 rowData 설정
        if (listType === 'artwork') {
            // 컬럼 설정
            columns = [
                { header: 'Title', key: 'title_kor', width: 10 },
                { header: 'Title', key: 'title_eng', width: 10 },
                { header: 'Artist', key: 'artist', width: 10 },
                { header: 'Register Date', key: 'register_date', width: 10 },
                { header: 'Size(h)', key: 'size_h', width: 10 },
                { header: 'Size(w)', key: 'size_w', width: 10 },
                { header: 'Size(d)', key: 'size_d', width: 10 },
                { header: 'Price', key: 'price', width: 10 },
                { header: 'Current Location', key: 'current_location', width: 50 },
                { header: 'Located Date', key: 'located_date', width: 20 },
                { header: 'Sale', key: 'sale', width: 10 },
                { header: 'Certification', key: 'certification', width: 10 }
            ];

            // row 데이터 생성
            rowData = data.map(item => {
                const latestLocation = item.location && item.location.length > 0
                    ? item.location.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
                    : null;

                return {
                    title_kor: item.name ? item.name[0] : 'N/A',
                    title_eng: item.name ? item.name[1] : 'N/A',
                    artist: item.artistName || 'N/A',
                    register_date: item.registerDate || 'N/A',
                    size_h: item.size ? item.size[0] : 'N/A',
                    size_w: item.size ? item.size[1] : 'N/A',
                    size_d: item.size ? item.size[2] : 'N/A',
                    price: item.price || 'N/A',
                    current_location: latestLocation
                        ? `${latestLocation.road || ''} ${latestLocation.extra || ''} ${latestLocation.detail || ''} (${latestLocation.postCode || ''})`
                        : 'No Location Info',
                    located_date: latestLocation ? latestLocation.date : 'N/A',
                    sale: item.sale || 'N/A',
                    certification: item.certification || 'N/A'
                };
            });

        } else if (listType === 'artist') {
            // artist에 대한 컬럼 설정
            columns = [
                { header: 'Artist Name (Kor)', key: 'name_kor', width: 10 },
                { header: 'Artist Name (Eng)', key: 'name_eng', width: 10 },
                { header: 'Birth', key: 'birth', width: 10 },
                { header: 'Tel', key: 'tel', width: 10 },
                { header: 'Homepage', key: 'homepage', width: 10 },
                { header: 'Register Date', key: 'registerday', width: 10 }
            ];

            // row 데이터 생성
            rowData = data.map(item => {
                return {
                    name_kor: item.artistName ? item.artistName[0] : 'N/A',
                    name_eng: item.artistName ? item.artistName[1] : 'N/A',
                    birth: item.artistBirth || 'N/A',
                    tel: item.artistTel || 'N/A',
                    homepage: item.artistHome || 'N/A',
                    registerday: item.registerDate || 'N/A'
                };
            });
        }

        // 시트에 컬럼 설정 및 데이터 추가
        sheet.columns = columns;
        rowData.forEach(row => {
            sheet.addRow(row);
        });

        // 엑셀 파일로 응답
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=${listType}_list.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('엑셀 다운로드 에러', error);
        res.status(500).json({ message: '엑셀 다운로드 실패', error });
    }
}

module.exports = excelListDown;