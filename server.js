const express = require('express');
const path = require('path');
const sassMiddleware = require('node-sass-middleware');
const { check, validationResult, header } = require('express-validator');
const app = express();
const { ObjectId } = require('mongodb')
const MongoStore = require('connect-mongo')
require('dotenv').config();
const bcrypt = require('bcrypt') 
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const ExcelJS = require('exceljs');
const { s3, deleteS3Image } = require('./module/s3.js')

const ArtworkListData = require('./middleware/ListDataArtwork.js')
const ArtistListData = require('./middleware/ListDataArtist.js')

const artistData = require('./middleware/artistData.js')
const artworkData = require('./middleware/artworkData.js')

const validateArtwork = require('./middleware/artworkValidation.js')
const multer = require('multer')
const multerS3 = require('multer-s3')

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.BUCKET_NAME,
    key: function (req, file, cb) {
      // 파일 이름 앞에 현재 시간과 파일 원본 이름을 결합하여 고유한 key 생성
      const uniqueKey = Date.now().toString() + '-' + file.originalname;
      cb(null, uniqueKey);
    }
  })
})

let connectDB = require('./database.js')
let db;
connectDB().then((client) => {
  console.log('DB 연결 성공');
  db = client.db('artworklist');  // client에서 데이터베이스 객체를 가져옴
  app.listen(process.env.PORT, () => {
    console.log('서버 http://localhost:8081');
  });
}).catch((err) => {
  console.log(err);
});

app.use(session({
  resave : false,
  saveUninitialized : false,
  secret: process.env.SESSION_KEY,
  cookie : {maxAge : 60 * 60 * 1000 },
  store: MongoStore.create({
    mongoUrl : process.env.DB_URL,
    dbName: 'artworklist',
  })
})) 



// SCSS를 CSS로 자동 컴파일하기 위한 미들웨어 설정
app.use(sassMiddleware({
    src: path.join(__dirname, 'public/scss'),
    dest: path.join(__dirname, 'public/css'),
    prefix: '/css',
    debug: true,
    outputStyle: 'compressed',
}));

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
  try {
    let result = await db.collection('user').findOne({ username: 입력한아이디 });
    if (!result) {
      return cb(null, false, { message: '존재하지 않는 회원' });
    }
    if (await bcrypt.compare(입력한비번, result.password)){
      return cb(null, result);
    } else {
      return cb(null, false, { message: '비밀번호가 틀렸습니다. ' });
    }
  } catch (error) {
    return cb(error);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user._id); // 세션에 사용자 ID만 저장
});

passport.deserializeUser(async (id, done) => {
  try {
    let result = await db.collection('user').findOne({ _id: new ObjectId(id) });
    if (result) {
      delete result.password; // 비밀번호는 제외
      done(null, result); // 사용자 정보 반환
    } else {
      done(null, false);
    }
  } catch (error) {
    done(error, false);
  }
});


app.set('view engine', 'ejs');

// 라우트 설정
app.get('/', (req, res) => {

 if(req.user){
  return  res.render('index.ejs',{result : req.user})
 }

 if(!req.user){
  return  res.render('index.ejs',{result : null})
 }


});


app.get('/login', ArtworkListData, async (req, res) => {

  const result = req.user || null;
  const data = req.ArtworkListData.data;
  const nextDirection = req.ArtworkListData.nextDirection || false; 
  const prevDirection = req.ArtworkListData.prevDirection || false;
  const nextBtnStatus = req.ArtworkListData.nextBtnStatus || false;
  const prevBtnStatus = req.ArtworkListData.prevBtnStatus || false;
  const pageFilter = req.ArtworkListData.pageFilter || 5;

  if (!req.user) {
    return res.render('login.ejs');
  }

  if (req.user.username === 'admin' || req.user.class === 0) {
      return res.render('admin/adminMain.ejs',
         { result: result, data: data, listType: "artwork" ,
           search : false, pageNum:0, 
           nextDirection:nextDirection,  prevDirection :  prevDirection , 
           nextBtnStatus : nextBtnStatus , prevBtnStatus : prevBtnStatus ,pageFilter:pageFilter
         }
        );
  }

  return res.render('index.ejs', { result: result });


});


app.post('/login', (req, res, next) => {
  passport.authenticate('local', (error, user, info) => {
    if (error) return res.status(500).json(error);
    if (!user) return res.status(401).json(info.message);
    req.logIn(user, (err) => {
      if (err) return next(err);  
      res.redirect('/');
    });
  })(req, res, next);

});


app.get('/logout', (req, res, next)=>{
  req.logout((err)=>{
    if(err){
      return next(err)
    }
      res.redirect('/')
  });

})


app.get('/register', (req, res) => {
  if (req.user) {
    return res.send('로그아웃 후 이용');
  }
  res.render('register.ejs');
});


app.post('/register', async (req, res)=>{

  let hashing = await bcrypt.hash(req.body.password, 10);

  await db.collection('user').insertOne({
    username : req.body.username,
    password : hashing,
    useremail : req.body.useremail,
    realname : req.body.realname,
    class : 1

  })
  res.redirect('/login')
})

app.post('/checkid', async(req,res)=>{


  let result = await db.collection('user').findOne({ username : req.body.username })
  console.log(result)
  if(result){
    res.json({ user : true }) // 존재함 : user에 ture 담기
  }else{
    res.json({ user : false }) // null : user에 false 담기
  }


})


// const { title } = require('process');
// const { register } = require('module');
// const { localsName } = require('ejs');

// app.use(checkLogin)

app.get('/viewer', (req, res) => {
  if(req.user){
    res.render('viewer.ejs');
  }else{
    res.render('login.ejs');
  }

});



app.get('/admin/list/artwork/:filter', ArtworkListData, async(req,res)=>{

  const result = req.user || null;
  const data = req.ArtworkListData.data; // 미들웨어에서 추가된 데이터 사용
  const nextDirection = req.ArtworkListData.nextDirection || false; 
  const prevDirection = req.ArtworkListData.prevDirection || false;
  const nextBtnStatus = req.ArtworkListData.nextBtnStatus || false;
  const prevBtnStatus = req.ArtworkListData.prevBtnStatus || false;
  const pageFilter = req.ArtworkListData.pageFilter || 5;

  return res.render('admin/adminMain.ejs',
     { 
      result: result, data: data, listType: "artwork", search : false , 
      pageNum: 0, nextDirection: nextDirection , nextBtnStatus : nextBtnStatus, prevDirection : prevDirection , prevBtnStatus: prevBtnStatus
      , pageFilter:pageFilter
     });

})


app.get('/admin/list/artwork/:filter/:Id/:Page', ArtworkListData, async(req,res)=>{
  const result = req.user || null;
  const data = req.ArtworkListData.data; // 미들웨어에서 추가된 데이터 사용
  const pageNum = parseInt(req.params.Page) ;
  const nextDirection = req.ArtworkListData.nextDirection || false; 
  const prevDirection = req.ArtworkListData.prevDirection || false;
  const nextBtnStatus = req.ArtworkListData.nextBtnStatus || false;
  const prevBtnStatus = req.ArtworkListData.prevBtnStatus || false;
  const pageFilter = req.ArtworkListData.pageFilter || 5;

  return res.render('admin/adminMain.ejs', 
    { 
      result: result, data: data, listType: "artwork", search : false, 
      pageNum:pageNum, nextDirection : nextDirection, prevDirection : prevDirection, 
      nextBtnStatus : nextBtnStatus, prevBtnStatus:prevBtnStatus , pageFilter:pageFilter

    });

})



app.get('/admin/list/artist/:filter', async(req,res)=>{

  let result = req.user || null;
  const pageNum = 0 ;
  const nextDirection = false; 
  const prevDirection = false;
  const nextBtnStatus = true;
  const prevBtnStatus = true;
  const pageFilter = parseInt(req.params.filter);
  // 클라이언트 url에서 pageNum을 받아와야함
  // 클라이언트 url에서 boardId를 받아와야함
  // 클라이언트 url에서 버튼의 direction 값을 가져와야함

  console.log(pageFilter)


  // pageNum이 있으며, boardId가 유효한 아이디 일때 matchQuery 설정을 해줘야함
  // matchQuery 설정
  // 이전 버튼을 눌렀을때는 리스트를 찾을때 boardId(게시글의 첫번째값) lt를 활용하여 이전의 값을 가져와야함 ,sort의 방향을 반대로 -1 , direction 의 불린 값을 설정
  // 다음 버튼을 눌렀을때는 리스트를 찾을때 boardId (게시글의 마지막값) gt를 활용하여 다음의 값을 가져와야함  , direction 의 불린 값을 설정

  // aggregate를 활용하여 상단의 값들을 필터링하여 가져온다.
  let data = await db.collection('artist').aggregate([
    {$limit : pageFilter}

  ]).toArray()
  // limit값은 pageFilter를 통해 클라이언트측에서 url로 받아온 필터옵션값을 가져온다

  // 버튼의 활성화 유무 체크
  // 첫번째 페이지는 무조건 이전버튼을 비활성화 해준다.
  // 이전버튼을 눌렀을때 게시글 - 필터 = 0 dlaus disabled 이전에 값이 없다는 뜻이다 

  // 다음 버튼을 눌렀을때 
  // 게시글의 마지막 id값을 가져와서 그 다음의 값이 있는지 확인해줘야한다. 있으면 true 없으면 false(button disabled)


  res.render('admin/adminMain.ejs',{
    data:data, result : result , listType : "artist", search : false,
    pageNum:pageNum, nextDirection : nextDirection, prevDirection : prevDirection, 
    nextBtnStatus : nextBtnStatus, prevBtnStatus:prevBtnStatus , pageFilter:pageFilter
  })

})


app.get('/admin/list/artist/:filter/:Id/:Page', async(req,res)=>{

  let result = req.user || null;
   // 클라이언트 url에서 pageNum을 받아와야함
  const pageNum = parseInt(req.params.Page) ;
  let nextDirection = true;
  let prevDirection = true;
  const nextBtnStatus = true;
  const prevBtnStatus = false;
  const pageFilter = parseInt(req.params.filter);
  // 클라이언트 url에서 boardId를 받아와야함
  const boardId = req.params.Id;
  // 클라이언트 url에서 버튼의 direction 값을 가져와야함
  const direction = req.query.direction;
  let sortDirection = 1;
  console.log(pageNum)


  // pageNum이 있으며, boardId가 유효한 아이디 일때 matchQuery 설정을 해줘야함
  let matchQuery = {};
  if(pageNum && ObjectId.isValid(boardId)){
  // 이전 버튼을 눌렀을때는 리스트를 찾을때 boardId(게시글의 첫번째값) lt를 활용하여 이전의 값을 가져와야함 ,sort의 방향을 반대로 -1 , direction 의 불린 값을 설정
  if(direction === 'prev'){
    matchQuery = {_id : {$lt : new ObjectId(boardId)}}
    sortDirection = -1;
    prevDirection = true;
    nextDirection = false;
  }else{
    matchQuery = {_id : {$gt : new ObjectId(boardId)}}
    prevDirection = false;
    nextDirection = true;
  }
  
  // 다음 버튼을 눌렀을때는 리스트를 찾을때 boardId (게시글의 마지막값) gt를 활용하여 다음의 값을 가져와야함  , direction 의 불린 값을 설정
  
  }
  // matchQuery 설정
 
  // aggregate를 활용하여 상단의 값들을 필터링하여 가져온다.
  let data = await db.collection('artist').aggregate([
    {$match : matchQuery},
    {$limit : pageFilter},
    {$sort :{_id : sortDirection}}
  ]).toArray()
  // limit값은 pageFilter를 통해 클라이언트측에서 url로 받아온 필터옵션값을 가져온다

  // 버튼의 활성화 유무 체크
  // 첫번째 페이지는 무조건 이전버튼을 비활성화 해준다.
  // 이전버튼을 눌렀을때 게시글 - 필터 = 0 dlaus disabled 이전에 값이 없다는 뜻이다 

  // 다음 버튼을 눌렀을때 
  // 게시글의 마지막 id값을 가져와서 그 다음의 값이 있는지 확인해줘야한다. 있으면 true 없으면 false(button disabled)


  res.render('admin/adminMain.ejs',{
    data:data, result : result , listType : "artist", search : false,
    pageNum:pageNum, nextDirection : nextDirection, prevDirection : prevDirection, 
    nextBtnStatus : nextBtnStatus, prevBtnStatus:prevBtnStatus , pageFilter:pageFilter
  })

})


app.get('/admin/list/user/:filter', async(req,res)=>{
  let result = req.user || null;

  const pageNum = parseInt(req.params.Page) ;
  const nextDirection = false; 
  const prevDirection = false;
  const nextBtnStatus = false;
  const prevBtnStatus = false;
  const pageFilter = parseInt(req.params.filter);
console.log(pageFilter)
  // 클라이언트 url에서 pageNum을 받아와야함
  // 클라이언트 url에서 boardId를 받아와야함
  // 클라이언트 url에서 버튼의 direction 값을 가져와야함

  // pageNum이 있으며, boardId가 유효한 아이디 일때 matchQuery 설정을 해줘야함
  // matchQuery 설정
  // 이전 버튼을 눌렀을때는 리스트를 찾을때 boardId(게시글의 첫번째값) lt를 활용하여 이전의 값을 가져와야함 ,sort의 방향을 반대로 -1 , direction 의 불린 값을 설정
  // 다음 버튼을 눌렀을때는 리스트를 찾을때 boardId (게시글의 마지막값) gt를 활용하여 다음의 값을 가져와야함  , direction 의 불린 값을 설정

  // aggregate를 활용하여 상단의 값들을 필터링하여 가져온다.
  let data = await db.collection('user').aggregate([
    {$limit : pageFilter}
  ]).toArray()
  // limit값은 pageFilter를 통해 클라이언트측에서 url로 받아온 필터옵션값을 가져온다

  // 버튼의 활성화 유무 체크
  // 첫번째 페이지는 무조건 이전버튼을 비활성화 해준다.
  // 이전버튼을 눌렀을때 게시글 - 필터 = 0 dlaus disabled 이전에 값이 없다는 뜻이다 

  // 다음 버튼을 눌렀을때 
  // 게시글의 마지막 id값을 가져와서 그 다음의 값이 있는지 확인해줘야한다. 있으면 true 없으면 false(button disabled)


  






  res.render('admin/adminMain.ejs',{
    data:data, result : result , listType : "user", search : false,
       pageNum:pageNum, nextDirection : nextDirection, prevDirection : prevDirection, 
      nextBtnStatus : nextBtnStatus, prevBtnStatus:prevBtnStatus , pageFilter:pageFilter
  })
})






//////////// ✨👩‍🎨 [POST] 작가 등록페이지 - 작가 데이터 등록하기 

app.post('/write/artist',
upload.single('artistimg'),
[

  check('artistnameKr').trim().isLength({ min: 1 }).withMessage('작가의 국문이름을 입력하세요'),
  check('artistnameEng').trim().isLength({ min: 1 }).withMessage('작가의 영문이름을 입력하세요'),
  check('EducationDate').optional().trim().isLength({ min: 1 }).withMessage('학력 날짜를 선택하세요'),
  check('EducationTitle').optional().trim().isLength({ min: 1 }).withMessage('학력 타이틀을 입력하세요'),
  check('soloExDate').optional().trim().isLength({ min: 1 }).withMessage('개인전 날짜를 선택하세요'),
  check('soloExTitle').optional().trim().isLength({ min: 1 }).withMessage('개인전 타이틀을 입력하세요'),
  check('groupExDate').optional().trim().isLength({ min: 1 }).withMessage('그룹전 날짜를 선택하세요'),
  check('groupExTitle').optional().trim().isLength({ min: 1 }).withMessage('그룹전 타이틀을 입력하세요'),
  check('awardExDate').optional().trim().isLength({ min: 1 }).withMessage('수상 날짜를 선택하세요'),
  check('awardTitle').optional().trim().isLength({ min: 1 }).withMessage('수상 타이틀을 입력하세요'),

],
artistData , async(req,res)=>{
    const result = req.artistData;
    const errors = validationResult(req);



       try{   
          if(!errors.isEmpty()){
            console.log(errors)
            return res.status(400).json({ errors: errors.array() });
          }else{
            await db.collection('artist').insertOne(result);
          }  
    
         res.redirect('/admin/list/artist/5');
       }catch(error){
         console.log('데이터 에러', error);
         res.status(500).send('서버 에러')
       }
    


 
})

//////////// ✨👩‍🎨 [POST] 작가 수정페이지 - 작가 데이터 수정하기

app.post('/edit/artist', upload.single('artistimg'), artistData , async (req, res)=>{

  
  const artistId = req.body.artistId;
  const result = req.user || null;
  const resultJson = JSON.stringify(result)
  const editData = req.artistData;

  try{
    await db.collection('artist').updateOne({_id : new ObjectId(artistId)},{$set : editData });
    res.redirect(`/admin/detail/artist/${artistId}`);

  }catch(error){
    
    res.status(500).send('서버 에러')
  }

})

//////////// ✨👩‍🎨 [GET] 작가 등록 페이지  - 페이지 띄우기 

app.get('/admin/write/artist', async(req,res)=>{
  try{
    res.render('admin/writeArtist.ejs',{result : req.user || null, data : null})
  }catch(error){
    console.error('Rendering error:', error);
    res.status(500).send('Server Error');
  }
 

})

//////////// ✨👩‍🎨 [GET] 작가 수정 페이지  - 서버사이드 랜더링 위한 데이터 보내기 

app.get('/admin/write/artist/:Id', async (req, res)=>{

  const result = req.user || null;
  const artistId = req.params.Id;

  let data = await db.collection('artist').find({_id : new ObjectId(artistId)}).toArray()


  res.render('admin/writeArtist.ejs', {result : result, data : data})


})

//////////// ✨👩‍🎨 [POST] 작가 삭제 페이지  -  fetch를 사용하여 작가 데이터 삭제하기
app.post('/admin/delete/artist/:Id', async(req,res)=>{

  //fetch에서 아이디값 받아옴
  artistId = req.params.Id;

  try{

    // 몽고디비에서 아티스트 imgUrl 가져옴 
    const artistImg = await db.collection('artist').findOne(
      {_id : new ObjectId(artistId)},
      {projection : {_id : 0, imgUrl : 1}}
    )

    // 작가의 작품 모두 조회
    const artworks = await db.collection('artwork').find({ artist: new ObjectId(artistId) }).toArray();


    //1. aws s3에서 작가 이미지 데이터 삭제해줌 (오로지 단일 이미지)
       await deleteS3Image(artistImg.imgUrl)

    //2. aws s3에서 작품 이미지들 삭제 해줌
    // 작품 이미지url들 배열돌면서 꺼내기
    artworks.forEach(artworkImg => {
      deleteS3Image(artworkImg.imgUrl);
    });

    //3. 몽고디비에서 작품 데이터 삭제
    await db.collection('artwork').deleteMany({artist: new ObjectId(artistId)})


    //4. 몽고디비에서 아티스트 데이터 삭제
    await db.collection('artist').deleteOne({_id : new ObjectId(artistId)})


    // 완료시 리다이렉트
    res.redirect('/admin/list/artist')


  }catch(error){
    res.status(500).json('작가 삭제실패' + error)
  }

})





//////////// ✨👩‍🎨 [GET] 작가 디테일 페이지  - 페이지 띄우기 

app.get('/admin/detail/artist/:Id', async (req,res)=>{

  const result = req.user || null;
  const artistId = req.params.Id;


  let artistData = await db.collection('artist').aggregate([
    {
      $match : {_id : new ObjectId(artistId)}
    },
    {
      $lookup : {
        from : 'artwork', 
        localField : '_id', 
        foreignField : 'artist', 
        as : 'artworkData'
      }
    },{
      $project: {
        _id: 1,
        imgUrl: 1,
        artistName: 1,
        soloEx: 1,
        groupEx: 1,
        award: 1,
        education : 1,
        artistBirth: 1,
        artistEmail: 1,
        artistTel: 1,
        artistHome: 1,
        artistNote: 1,
        artistDescription: 1,
        'artworkData._id': 1,
        'artworkData.name': 1,
        'artworkData.price': 1,
        'artworkData.imgUrl' : 1
      }
    }
  ]).toArray();


  res.render('artistDetail.ejs', {result : result, artistData : artistData})


})



//////////// 🖼️  [GET] 작품 등록 - 페이지 띄우기 
// 등록하려는 작품의 작가 아이디 값이 있어야함

app.get('/admin/write/artwork/:Id' , async(req, res)=>{

  const result = req.user || null;
  const artistId =  req.params.Id;
  const artistData = await db.collection('artist').find({_id : new ObjectId(artistId)}).toArray();


  res.render('admin/writeArtwork.ejs', {result : result, artistData : artistData, artworkData : null })


})

//////////// 🖼️ [GET] 작품 수정 페이지 - 서버사이드 랜더링 위한 데이터 보내기 

// 수정하려는 작품의 아이디 값이 있어야함
// 작품 등록페이지 재활용
app.get('/admin/edit/artwork/:Id', async(req,res)=>{

  const result = req.user || null;
  const artworkData = await db.collection('artwork').find({_id : new ObjectId(req.params.Id)}).toArray();
  const artistData = await db.collection('artist').find({_id : new ObjectId(artworkData[0].artist)}).toArray(); 


  res.render('admin/writeArtwork.ejs', {result : result, artworkData : artworkData , artistData : artistData})

})


//////////// 🖼️ [POST] 작품 수정 페이지 - 작품 데이터 수정하기
app.post('/admin/edit/artwork/:Id', 
  upload.fields([
    {name : 'file1', maxCount : 1},
    {name : 'file2', maxCount : 1},
    {name : 'file3', maxCount : 1},
    {name : 'file4', maxCount : 1},
    {name : 'file5', maxCount : 1},
  ]), 
  validateArtwork ,
   ArtworkListData , artworkData ,async (req, res)=>{
  
  try{
    await db.collection('artwork').updateOne({_id : new ObjectId(req.params.Id)}, {$set : req.data});

  
    res.redirect('/admin/list/artwork');
  }catch(error){
    console.error('작품 수정 중 오류 발생:', error);
    res.status(500).json('작품 수정 중 서버 오류 발생: ' + error);
  }



});


//////////// 🖼️ [POST] 작품 등록 페이지 - 작품 데이터 등록하기

app.post('/admin/write/artwork/:Id',
upload.fields([
  {name : 'file1', maxCount : 1},
  {name : 'file2', maxCount : 1},
  {name : 'file3', maxCount : 1},
  {name : 'file4', maxCount : 1},
  {name : 'file5', maxCount : 1},
]), 
validateArtwork,
ArtworkListData,
artworkData,
async(req,res)=>{
  try{    
    console.log('location JSON :', JSON.stringify(req.data.location)); 
    await db.collection('artwork').insertOne(req.data);

    res.redirect('/admin/list/artwork')


  }catch(error){
    res.status(500).json(' 작품 등록 진행중 서버에러 ' + error)
  } 

})



//////////// 🖼️ [POST] 작품 삭제  - fetch를 사용하여 작품 데이터 삭제하기

app.post('/admin/delete/artwork/:Id', async(req,res)=>{

  const artworkId = req.params.Id;
  console.log(artworkId) 


  try{

    const artworkImg = await db.collection('artwork').findOne(
      {_id : new ObjectId(artworkId )},
      {projection: { _id: 0, imgUrl: 1 }}
    )
      if(!artworkImg){ return res.status(400).json({ message : ' 작품 이미지가 존재하지 않습니다. ' }) }
    
      // 작품의 이미지 url를 배열로 가져옴
      const artworkImgArray = artworkImg.imgUrl;
      // s3에서 이미지 삭제 
      await deleteS3Image(artworkImgArray);
    
      //deleteOne 이용하여 몽고디비에서 데이터삭제
      await db.collection('artwork').deleteOne({_id : new ObjectId(artworkId)});

      console.log('이미지 및 데이터 삭제 모두 완료')
      res.redirect('/admin/list/artwork')

  }catch(error){
    res.status(500).json('작품 삭제실패' + error)
  }

})

//////////// 🖼️ [GET] 작품 디테일 
app.get('/admin/detail/artwork/:Id', async(req, res)=>{


  const result = req.user || null;

  try{

    const artworkId = req.params.Id;

    // 1. 해당하는 아트워크 DB 조회
    const artworkData = await db.collection('artwork').findOne({ _id: new ObjectId(artworkId) });
    let artistName = await db.collection('artist').findOne({_id : artworkData.artist})
    artistName = artistName.artistName[0]

  
    res.render('artworkDetail.ejs', {result : result, artworkData : artworkData , artistName : artistName})

  }catch(error){

  }


})

//  🌐 SEARCH Artist
app.get('/search/artist', async(req,res)=>{

  const result = req.user || null;
  const searchVal = req.query.val;

  try{
    let option = [
      {
        $search : {
          index : 'artistName_index',
          text : { query : searchVal , path : 'artistName' }
        }
      }
    ]
  
    let searchData = await db.collection('artist').aggregate(option).toArray();
  
    res.render('admin/adminMain.ejs', { listType: "artist" , search : searchVal , data: searchData , result: result})
  }catch(error){
    console.error('검색에러:', error);
    res.status(500).json({ message: '검색에러', error });
  }





})

//  🌐 SEARCH Artwork

app.get('/search/artwork', async (req, res) => {
  const result = req.user || null;
  const searchVal = req.query.val;

  try {
    // `artwork` 컬렉션에서 검색 쿼리와 artist 조인 수행
    let searchData = await db.collection('artwork').aggregate([
      {
        $search: {
          index: 'artwork_name',
          text: { 
            query: searchVal, 
            path: ['name', 'artistName'] 
          }
        }
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

    res.render('admin/adminMain.ejs', { 
      listType: "artwork", 
      search: searchVal, 
      data: searchData, 
      result: result 
    });
  } catch (error) {
    console.error('검색에러:', error);
    res.status(500).json({ message: '검색실패', error });
  }
});




//  🌐 SEARCH User ( 추후에 진행)


// ✅ 엑셀로 다운로드 
app.get('/admin/list/download/:Id', async (req, res) => {


  try{
    //아트워크 
    const workbook = new ExcelJS.Workbook();
      // 문서 첫 행 고정 
      const sheet = workbook.addWorksheet( `${req.params.Id} - 리스트`, {
        views:[
          {state: 'frozen', xSplit: 1, ySplit: 1}
        ],
        
      });

      // 
      sheet.columns = [
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
        { header: 'Certification', key: 'certification', width: 10 },
      ]

     //데이터 가져오기 
     let data = await db.collection(req.params.Id).find().toArray();

     //데이터 가공


      console.log(data)

    const rowData = data.map(data=>{

      const latestLocation = data.location
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0]; // 최신 날짜 객체 선택
  
      return{
        title_kor:data.name[0],
        title_eng:data.name[1],
        artist: data.artistName,
        register_date: data.registerDate,
        size_h: data.size[0],
        size_w: data.size[1],
        size_d: data.size[2],
        price: data.price,
        located_date : latestLocation.date,
        current_location:  `${latestLocation.road} ${latestLocation.extra} ${latestLocation.detail} (${latestLocation.postCode}) `,
        sale: data.sale,
        certification: data.certification,
      }


    })

      // 데이터를 시트에 추가하기 
      rowData.forEach(data => {
        sheet.addRow(data);
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${req.params.Id}_list.xlsx`
      );


      await workbook.xlsx.write(res);
      res.end(); // 응답 완료
      

  

  }catch(error){
    console.error('엑셀 다운로드 에러', error)
    res.status(500).json({message : '엑셀 다운로드 실패', error})

  }
});

// 검색 결과 다운로드 

app.get('/search/:Id', async(req,res)=>{
  console.log(req.params.Id)


})