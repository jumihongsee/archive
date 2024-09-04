const express = require('express');
const path = require('path');
const sassMiddleware = require('node-sass-middleware');
const { check, validationResult } = require('express-validator');
const app = express();
const { ObjectId } = require('mongodb')
const MongoStore = require('connect-mongo')
require('dotenv').config();
const bcrypt = require('bcrypt') 

const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const ArtworkJoinArtist = require('./middleware/ArtistJoinArtwork.js')

const { s3, deleteS3Image } = require('./module/s3.js')
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
 //res.sendFile(path.join(__dirname, 'index.html'));
 if(req.user){
  return  res.render('index.ejs',{result : req.user})
 }

 if(!req.user){
  return  res.render('index.ejs',{result : null})
 }


});



app.get('/login', ArtworkJoinArtist, async (req, res) => {

  const result = req.user || null;
  const data = req.ArtworkJoinArtist;

  if (!req.user) {
    return res.render('login.ejs');
  }

  if (req.user.username === 'admin' || req.user.class === 0) {
      return res.render('admin/adminMain.ejs', { result: result, data: data, listType: "artwork" });
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

let checkLogin = require('./middleware/checkLogin.js');
const { title } = require('process');
const { register } = require('module');

app.use(checkLogin)

app.get('/viewer', (req, res) => {
  if(req.user){
    res.render('viewer.ejs');
  }else{
    res.render('login.ejs');
  }

});

app.get('/admin/list/artwork', ArtworkJoinArtist, async(req,res)=>{

  const result = req.user || null;

  const data = req.ArtworkJoinArtist; // 미들웨어에서 추가된 데이터 사용

  return res.render('admin/adminMain.ejs', { result: result, data: data, listType: "artwork" });

  

})

app.get('/admin/list/artist', async(req,res)=>{

  let result = req.user || null;
  let data = await db.collection('artist').find().toArray()


  res.render('admin/adminMain.ejs',{data:data, result : result , listType : "artist"})
})

app.get('/admin/list/user', async(req,res)=>{

  let result = req.user || null;
  let data = await db.collection('user').find().toArray()


  res.render('admin/adminMain.ejs',{data:data, result : result , listType : "user"})
})

////////////📌 작가 등록 페이지 POST

app.post('/write/artist', upload.single('artistimg'), artistData , async(req,res)=>{
  const result = req.artistData;
    
    try{     
      await db.collection('artist').insertOne(result);
       
      res.redirect('/admin/list/artist');
    }catch(error){
      console.log('데이터 에러', error);
      res.status(500).send('서버 에러')
    }
 
})

////////////📌 작가 수정 페이지 POST

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
        'artworkData.price': 1
      }
    }
  ]).toArray();


  res.render('artistDetail.ejs', {result : result, artistData : artistData})


})


////////////📌 작가 등록 페이지 GET

app.get('/admin/write/artist', async(req,res)=>{
  try{
    res.render('admin/writeArtist.ejs',{result : req.user || null, data : null})
  }catch(error){
    console.error('Rendering error:', error);
    res.status(500).send('Server Error');
  }
 

})

////////////📌 작가 수정 페이지 GET  

app.get('/admin/write/artist/:Id', async (req, res)=>{

  const result = req.user || null;
  const artistId = req.params.Id;

  let data = await db.collection('artist').find({_id : new ObjectId(artistId)}).toArray()


  res.render('admin/writeArtist.ejs', {result : result, data : data})


})



////////////📌 작품 등록 페이지 GET
// 등록하려는 작품의 작가 아이디 값이 있어야함

app.get('/admin/write/artwork/:Id' , async(req, res)=>{

  const result = req.user || null;
  const artistId =  req.params.Id;
  const artistData = await db.collection('artist').find({_id : new ObjectId(artistId)}).toArray();


  res.render('admin/writeArtwork.ejs', {result : result, artistData : artistData, artworkData : null })


})

////////////📌 작품 수정 페이지 GET
// 수정하려는 작품의 아이디 값이 있어야함
// 작품 등록페이지 재활용
app.get('/admin/edit/artwork/:Id', async(req,res)=>{

  const result = req.user || null;
  const artworkData = await db.collection('artwork').find({_id : new ObjectId(req.params.Id)}).toArray();
  const artistData = await db.collection('artist').find({_id : new ObjectId(artworkData[0].artist)}).toArray(); 


  res.render('admin/writeArtwork.ejs', {result : result, artworkData : artworkData , artistData : artistData})

})


////////////📌 작품 수정 페이지 POST
app.post('/admin/edit/artwork/:Id', 
  upload.fields([
    {name : 'file1', maxCount : 1},
    {name : 'file2', maxCount : 1},
    {name : 'file3', maxCount : 1},
    {name : 'file4', maxCount : 1},
    {name : 'file5', maxCount : 1},
  ]), 
  validateArtwork , ArtworkJoinArtist , artworkData ,async (req, res)=>{
  
  try{
    await db.collection('artwork').updateOne({_id : new ObjectId(req.params.Id)}, {$set : req.data});

  
    res.redirect('/admin/list/artwork');
  }catch(error){
    console.error('작품 수정 중 오류 발생:', error);
    res.status(500).json('작품 수정 중 서버 오류 발생: ' + error);
  }



});


////////////📌 작품 등록 페이지 POST

app.post('/admin/write/artwork/:Id',
upload.fields([
  {name : 'file1', maxCount : 1},
  {name : 'file2', maxCount : 1},
  {name : 'file3', maxCount : 1},
  {name : 'file4', maxCount : 1},
  {name : 'file5', maxCount : 1},
]), 
validateArtwork,
ArtworkJoinArtist,
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



////////////📌 작품 삭제  POST
app.get('/admin/delete/artwork/:Id', async(req,res)=>{

  const artworkId = req.params.Id;
  console.log(artworkId) 

  // 작품 데이터를 조회하여 이미지 url을 가져옴
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

  }





})




////////////📌 작가 삭제  POST