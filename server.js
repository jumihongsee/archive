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
//const { S3Client } = require('@aws-sdk/client-s3')
const { s3 } = require('./module/s3.js')
const artistData = require('./middleware/artistData.js')

const multer = require('multer')
const multerS3 = require('multer-s3')


const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.BUCKET_NAME,
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + path.extname(file.originalname)); 
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

app.get('/admin/write/artist', async(req,res)=>{
  try{
    res.render('admin/writeArtist.ejs',{result : req.user || null, data : null})
  }catch(error){
    console.error('Rendering error:', error);
    res.status(500).send('Server Error');
  }
 

})

app.get('/admin/write/artist/:Id', async (req, res)=>{

  const result = req.user || null;
  const artistId = req.params.Id;

  let data = await db.collection('artist').find({_id : new ObjectId(artistId)}).toArray()


  res.render('admin/writeArtist.ejs', {result : result, data : data})


})

app.get('/admin/write/artwork/:Id' , async(req, res)=>{

  const result = req.user || null;
  const artistId =  req.params.Id;
  const artistData = await db.collection('artist').find({_id : new ObjectId(artistId)}).toArray();

  res.render('admin/writeArtwork.ejs', {result : result, artistData : artistData })

})

app.post('/admin/write/artwork',
upload.fields([
  {name : 'file1', maxCount : 1},
  {name : 'file2', maxCount : 1},
  {name : 'file3', maxCount : 1},
  {name : 'file4', maxCount : 1},
  {name : 'file5', maxCount : 1},

]), 
[
  // 유효성검사

  check('artworkNameKr').trim().notEmpty().withMessage('작품의 국문을 입력하세요'),
  check('artworkNameEng').trim().notEmpty().withMessage('작품의 영문을 입력하세요'),
  check('artworkMedium').trim().notEmpty().withMessage('작품의 재료를 입력하세요'),
  check('artworkMadeDate').trim().isNumeric().withMessage('작품의 제작년도를 입력하세요'),
  check('artworkSizeHeight').trim().isNumeric().withMessage('작품의 높이를 입력하세요'),
  check('artworkSizeWidth').trim().isNumeric().withMessage('작품의 넓이를 입력하세요'),
  check('saleStatus').trim().notEmpty().withMessage('판매 여부를 선택하세요'),
  check('certificationStatus').trim().notEmpty().withMessage('보증서 여부를 선택하세요'),
  check('artworkSaleStart').trim().notEmpty().withMessage('저작 시작 날짜를 입력하세요'),
  check('artworkSaleEnd').trim().notEmpty().withMessage('저작 만료 날짜를 입력하세요'),
  check('artworkPrice').trim().notEmpty().withMessage('가격을 기입하세요'),
  // 동적으로 생성되는 필드들에 대한 유효성 검사
  check('postCode').optional().trim().notEmpty().withMessage('우편번호를 입력하세요'),
  check('roadAdress').optional().trim().notEmpty().withMessage('도로명을 입력하세요'),
  check('jibunAdress').optional().trim().notEmpty().withMessage('지번주소를 입력하세요'),
  check('locationDate').optional().trim().notEmpty().withMessage('작품 위치 날짜를 입력하세요'),
  
  check('files')
  .custom((value, { req }) => {
    const files = req.files;
    // 파일이 하나라도 있는지 검사
    if (files['file1'] || files['file2'] || files['file3'] || files['file4'] || files['file5']) {
      return true;
    }
    throw new Error('최소한 하나의 파일을 업로드해야 합니다.');
  }),

],
ArtworkJoinArtist,
async(req,res)=>{
  
  // 파일이 존재할 경우에만 전송 처리
  // const files = req.files;
  // 이미지 저장 주소 files['file1'][0]F
  // 파일이 존재할 경우에만 전송 처리

  const errors = validationResult(req);
  if(!errors.isEmpty()){
    console.log(errors)
    return res.status(400).json({ errors: errors.array() });
    
  }
 
  try{


    const {
      artworkNameKr,
      artworkNameEng,
      artworkMedium,
      artworkMadeDate,
      artworkSizeHeight,
      artworkSizeWidth,
      artworkSizeDepth,
      postCode,
      roadAdress,
      jibunAdress,
      extraAddress,
      detailAddress,
      locationDate,
      saleStatus,
      certificationStatus,
      artworkSaleStart,
      artworkSaleEnd,
      artistId ,
      artworkPrice
      

    } = req.body;

    

    const inputDataNull =(value)=> value === '' ? null : value;
    // 작품 이름 배열 처리
    const artworkName = [inputDataNull(artworkNameKr),inputDataNull(artworkNameEng)]
  
    // 작품 사이즈 배열 처리
    const artworkSize = [inputDataNull(artworkSizeHeight), inputDataNull(artworkSizeWidth), inputDataNull(artworkSizeDepth)]

    // 저작기간 배열 정리
    const artworkCopyRight = [inputDataNull(artworkSaleStart), inputDataNull(artworkSaleEnd)]

    

 

    // 위치 배열 처리
    if( Array.isArray(postCode) && Array.isArray(roadAdress) &&
        Array.isArray(extraAddress) && Array.isArray(detailAddress) &&
        Array.isArray(locationDate) && Array.isArray(jibunAdress)
      ){
        location = locationDate.map((date, i)=>{

          return{
      
            date : new Date(inputDataNull(date)) ,
            road : roadAdress[i] +  extraAddress[i] + detailAddress[i],
            location_Jibun : jibunAdress[i],
          }

        })
    }else{
      location = [{
          date: new Date(inputDataNull(locationDate)) ,
          road: roadAdress + extraAddress + detailAddress,
          location_Jibun: jibunAdress
      }];
    }
    
    location.sort((a,b)=> a.date - b.date )
    console.log('솔트된 배열 ' + location)
    console.log('현재위치' + location[0])
    
    //현재 배송지 (추후)


    // 분류 > 특징적인 단어 나열 후 추후 검색시에 찾을 수 있게 함. (추후)



    // 이미지 url 배열처리
    const imgUrl = [];

    for(let i = 1; i <= 5; i++){
      const fileNum = `file${i}`;
      if(req.files[fileNum] && req.files[fileNum][0]){
        const fileLocation = req.files[fileNum][0].location;
        imgUrl.push(fileLocation);
      }
    }
 

    
    
    // 데이터 등록 


    const data = {
      artist : new ObjectId(artistId) , 
      imgUrl : imgUrl,
      location : location,
      name : artworkName,
      size : artworkSize,
      price : artworkPrice,
      copyRight : artworkCopyRight,
      registerDate : new Date(),
      medium: artworkMedium,
      madeDate: artworkMadeDate,
      sale : saleStatus,
      certification : certificationStatus,
    }

    

    await db.collection('artwork').insertOne(data);
    
      


    res.redirect('/admin/list/artwork')

  }catch(error){
    console.log('서버에러', error)
  }

  






})
