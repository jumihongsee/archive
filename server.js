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
const artworkData = require('./middleware/artworkDataLookup.js')
const { formatDate, formatPhoneNumber, formatPrice } = require('./module/Formatting.js');

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
const { register } = require('module');

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

app.post('/write/artist', upload.single('artistimg') , async(req,res)=>{

  
  try{
      let imgUrl = null;
      if (req.file) {
        imgUrl = req.file.location;
      }
    
      const {
        artistnameKr,
        artistnameEng,
        artistBirth,
        artistEmail,
        artistTel,
        artistHome,
        artistNote,
        artistDescription,
        soloExDate,
        soloExTitle,
        groupExDate,
        groupExTitle,
        awardExDate,
        awardTitle
      } = req.body;
    
      // 값이 있는지 검사하는 변수
      const inputDataNull = (value) => value === '' ? null : value;
    
      // 작가 이름 배열 정리 
      const artistName = [inputDataNull(artistnameKr), inputDataNull(artistnameEng)];
    
      let soloEx = [];
      let groupEx = [];
      let award = [];
    
      // 연락처는 오로지 숫자만 
    
      // 개인전 배열 처리
      if (Array.isArray(soloExDate) && Array.isArray(soloExTitle)) {
        soloEx = soloExDate.map((date, i) => ({
          date: inputDataNull(date),
          exTitle: inputDataNull(soloExTitle[i])
        }));
      } 
    
      // 그룹전 배열 처리
      if (Array.isArray(groupExDate) && Array.isArray(groupExTitle)) {
        groupEx = groupExDate.map((date, i) => ({
          date: inputDataNull(date),
          exTitle: inputDataNull(groupExTitle[i])
        }));
      } 
      
    
      // 수상 배열 처리
      if (Array.isArray(awardExDate) && Array.isArray(awardTitle)) {
        award = awardExDate.map((date, i) => ({
          date: inputDataNull(date),
          exTitle: inputDataNull(awardTitle[i])
        }));
      }
    
    
      let result = {
        imgUrl: inputDataNull(imgUrl),
        artistName: artistName,
        soloEx: soloEx,
        groupEx: groupEx,
        award: award,
        artistBirth: inputDataNull(artistBirth),
        artistEmail: inputDataNull(artistEmail),
        artistTel: inputDataNull(formatPhoneNumber(artistTel)),
        artistHome: inputDataNull(artistHome),
        artistNote: inputDataNull(artistNote),
        artistDescription: inputDataNull(artistDescription),
        registerDate : formatDate(new Date())
     
      };
    
      // MongoDB에 데이터 삽입
      await db.collection('artist').insertOne(result);
    
      
      // 페이지 리다이렉트
      res.redirect('/admin/list/artist');
  }catch(error){
    console.error('에러발생', error);
    res.status(500).send('server error')
  }

 
})