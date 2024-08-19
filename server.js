const express = require('express');
const path = require('path');
const sassMiddleware = require('node-sass-middleware');
const app = express();
const { ObjectId } = require('mongodb')
const MongoStore = require('connect-mongo')
require('dotenv').config();
const bcrypt = require('bcrypt') 

const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const artworkData = require('./middleware/artworkData.js')

const { S3Client } = require('@aws-sdk/client-s3')
const multer = require('multer')
const multerS3 = require('multer-s3')

const s3 = new S3Client({
  region : 'ap-northeast-2',
  credentials : {
      accessKeyId : process.env.IAM_ACCESS,
      secretAccessKey : process.env.IAM_SECRET_KEY 
  }
})

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: "jumihongsee",
    key: function (요청, file, cb) {
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
    /* 입력 경로: SCSS 파일이 있는 폴더 */
    src: path.join(__dirname, 'scss'),
    /* 출력 경로: 컴파일된 CSS 파일이 저장될 폴더 */
    dest: path.join(__dirname, 'public/css'),
    /* 브라우저에서 접근할 때 사용할 경로 */
    prefix: '/css',
    /* SCSS 파일이 변경될 때마다 CSS 파일을 자동으로 업데이트 */
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



app.get('/login', artworkData, async (req, res) => {

  const result = req.user || null;
  const data = req.artworkData;

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

app.use(checkLogin)

app.get('/viewer', (req, res) => {
  if(req.user){
    res.render('viewer.ejs');
  }else{
    res.render('login.ejs');
  }

});

app.get('/admin/list/artwork', artworkData, async(req,res)=>{

  const result = req.user || null;

  const data = req.artworkData; // 미들웨어에서 추가된 데이터 사용

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

app.get('/admin/write/artist', async(req,res)=>{
  res.render('admin/writeArtist.ejs',{result : req.user})

})

app.post('/write/artist', upload.single('artistimg') ,async(req,res)=>{
  // 객제 구조 분해 할당 문법으로 req.body 객체에 포함된 속성을 개별 변수로 추출
  console.log(req.file)
  res.json({ imageUrl: req.file.location });
  const {
    artistnameKr,
    artistnameEng,
    artistBirth,
    artistEmail,
    artistTel,
    artistHome,
    soloExDate,
    soloExTitle,
    groupExDate,
    groupExTitle,
    awardDate,
    awardTitle,
    artistNote,
    artistDescription
  } = req.body;

   // input값중에서 ''공란인것은 데이터를 null 값으로 변환 삼항연산자

   const inputDataNull = (value)=>{
      return value === '' ? null : value
   }

   // artist name : 작가 이름도 배열로 저장해줘야함 한국어/영어 순으로
   const artistName = [inputDataNull(artistnameKr), inputDataNull(artistnameEng)];

   let soloEx = [];
   let groupEx = [];
   let award = [];


  // 개인전 , 그룹전 , 수상 배열로 저장 해줘야함 map으로 돌려
  if(soloExDate || soloExTitle){
    const soloEx = soloExDate.map((date, i)=>{
      return {
        date : inputDataNull(date),
        exTitle : inputDataNull(soloExTitle[i])
      }
   })
  }

  if(groupExDate || groupExDate){
    const groupEx = groupExDate.map((date, i)=>{
      return {
        date : inputDataNull(date),
        exTitle : inputDataNull(groupExTitle[i])
      }
   })
  }

  if(awardDate || awardTitle){
    const award = awardDate.map((date, i)=>{
      return {
        date : inputDataNull(date),
        exTitle : inputDataNull(awardTitle[i])
      }
   })
  }



   let result = {
      artistName : artistName , //필수값 유효성 검사
      soloEx : soloEx,
      goupEx : groupEx, 
      award : award, 
      artistBirth :inputDataNull(artistBirth) ,
      artistEmail :inputDataNull(artistEmail) , 
      artistTel :inputDataNull(artistTel) , 
      artistHome : inputDataNull(artistHome),
      artistNote : inputDataNull(artistNote ),
      artistDescription : inputDataNull(artistDescription)
   }
  
  // 몽고디비에 인설트 하기 
   await db.collection('artist').insertOne(result)

  // 멀터 미들웨어로 이미지파일 등록

  // 데이터 등록시 날짜 등록




})