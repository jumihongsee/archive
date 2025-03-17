# 프로젝트 개요
<br/>
## 프로젝트명 : 아카이브
<br/>
이 프로젝트는 Node.js와 Express를 기반으로 한 웹 애플리케이션으로 예술계에서 활동하는 작가들의 라이선스를 받아 작가의 개인정보 및 작품 정보를 손쉽게 통합 관리할 수 있는 웹 아카이브입니다. <br/>
데이터베이스는 MongoDB를 사용하였으며. 사용자 인증 및 권한 관리, 게시판 기능, 아티스트 및 아트워크 등록/관리, 데이터 엑셀 다운로드 등의 기능을 포함합니다.<br/>
<br/><br/>
# 0. 기술스택<br/>
   Backend: Node.js, Express, MongoDB, Mongoose  <br/>
   Frontend: JavaScript, SCSS<br/>
   Auth: Passport.js, Bcrypt, Express-session<br/>
   Storage: Multer, AWS S3<br/>
   Validation: Express-validator<br/>
   Excel Export: ExcelJS<br/>
<br/>
# 1. 환경설정<br/>
 1.1 Node.js + Express 설정<br/>
     express 설치 및 기본 서버 구성<br/>
     dotenv 패키지를 사용하여 환경 변수 설정 (.env 파일 사용)<br/>
     database.js를 통해 MongoDB 연결 설정<br/>
     <br/>
 1.2 SCSS 연동<br/>
 node-sass를 사용하여 SCSS를 컴파일하고 스타일 적용<br/>
<br/>
 1.3 MongoDB 설정<br/>
 mongoose를 이용한 스키마 및 모델 설계<br/>
 database.js 파일에서 MongoDB 연결 관리<br/>
<br/>
 1.4 보안 설정<br/>
 dotenv를 이용한 환경변수 관리 (DB 연결 정보, 비밀번호 해싱 키 등)<br/>
 bcrypt를 사용한 비밀번호 해싱 처리<br/>
 connect-mongo를 사용한 세션 저장 및 관리<br/>
 express-session 및 passport를 이용한 사용자 인증 구현<br/>
<br/>
# 2. 기능구현<br/>
 2.1 회원가입 및 로그인 기능<br/>
 passport 및 express-session을 활용한 사용자 인증<br/>
 bcrypt를 사용한 비밀번호 암호화 및 검증<br/>
 connect-mongo를 이용한 세션 저장<br/>
 JavaScript를 활용한 회원가입 및 로그인 유효성 검사<br/>
<br/>
 2.2 관리자 기능<br/>
 사용자, 아티스트, 아트워크 게시판 리스트 데이터 출력<br/>
 MongoDB $lookup 파이프라인을 사용하여 artist 및 artwork 컬렉션 조인<br/>
<br/>
 2.3 아티스트 및 아트워크 관리<br/>
 multer 및 AWS S3를 이용한 이미지 업로드 및 저장<br/>
 express-validator를 이용한 유효성 검사<br/>
 JavaScript를 활용한 동적 입력 필드 추가 기능 구현<br/>
 검색 기능 구현 (아티스트명, 작품명 인덱싱)<br/>
 exceljs를 이용한 아티스트 및 아트워크 데이터 엑셀 다운로드<br/>
<br/>
 2.4 이미지 및 파일 처리<br/>
 다중 이미지 업로드 및 수정 로직 구현<br/>
 S3 저장소에서 기존 이미지 삭제 후 새로운 이미지 등록<br/>
 이미지 URL 통일화 (MongoDB 저장 URL과 AWS S3 저장 URL 간 인코딩 차이 해결)<br/>
<br/>
 2.5 게시판 및 데이터 관리<br/>
 CRUD 기능 구현 (게시글 등록, 수정, 삭제)<br/>
 필터 및 정렬 기능 구현<br/>
 MongoDB 인덱싱을 활용한 검색 최적화<br/>
 mongoose 미들웨어를 활용한 데이터 처리 모듈화<br/>
<br/>
 2.6 UI 및 퍼블리싱<br/>
 메인 페이지, 로그인, 회원가입, 네비게이션 UI 퍼블리싱<br/>
 관리자 페이지 및 목록 페이지 디자인 개선<br/>
 리스트 및 상세 페이지 디자인 적용<br/>
<br/>
 2.7 오류 수정 및 최적화<br/>
 동적 UI 삭제 및 값 채우기 시 이벤트 위임 (event delegation)<br/>
 JavaScript에서 입력값 길이에 따라 height 자동 조정<br/>
 페이지네이션 개선 (커서 기반 페이지네이션 적용)<br/>
 데이터 삭제 및 등록 후 redirect URL 수정<br/>
 삭제 시 연관 데이터 자동 삭제 (아티스트 삭제 시 등록한 작품도 함께 삭제)<br/>
