프로젝트 개요

프로젝트명 : 아카이브

이 프로젝트는 Node.js와 Express를 기반으로 한 웹 애플리케이션으로 예술계에서 활동하는 작가들의 라이선스를 받아 작가의 개인정보 및 작품 정보를 손쉽게 통합 관리할 수 있는 웹 아카이브입니다. 
데이터베이스는 MongoDB를 사용하였으며. 사용자 인증 및 권한 관리, 게시판 기능, 아티스트 및 아트워크 등록/관리, 데이터 엑셀 다운로드 등의 기능을 포함합니다.

0. 기술스택
   Backend: Node.js, Express, MongoDB, Mongoose
   Frontend: JavaScript, SCSS
   Auth: Passport.js, Bcrypt, Express-session
   Storage: Multer, AWS S3
   Validation: Express-validator
   Excel Export: ExcelJS

1. 환경설정
 1.1 Node.js + Express 설정
     express 설치 및 기본 서버 구성
     dotenv 패키지를 사용하여 환경 변수 설정 (.env 파일 사용)
     database.js를 통해 MongoDB 연결 설정
 
 1.2 SCSS 연동
 node-sass를 사용하여 SCSS를 컴파일하고 스타일 적용

 1.3 MongoDB 설정
 mongoose를 이용한 스키마 및 모델 설계
 database.js 파일에서 MongoDB 연결 관리

 1.4 보안 설정
 dotenv를 이용한 환경변수 관리 (DB 연결 정보, 비밀번호 해싱 키 등)
 bcrypt를 사용한 비밀번호 해싱 처리
 connect-mongo를 사용한 세션 저장 및 관리
 express-session 및 passport를 이용한 사용자 인증 구현

2. 기능구현
 2.1 회원가입 및 로그인 기능
 passport 및 express-session을 활용한 사용자 인증
 bcrypt를 사용한 비밀번호 암호화 및 검증
 connect-mongo를 이용한 세션 저장
 JavaScript를 활용한 회원가입 및 로그인 유효성 검사

 2.2 관리자 기능
 사용자, 아티스트, 아트워크 게시판 리스트 데이터 출력
 MongoDB $lookup 파이프라인을 사용하여 artist 및 artwork 컬렉션 조인

 2.3 아티스트 및 아트워크 관리
 multer 및 AWS S3를 이용한 이미지 업로드 및 저장
 express-validator를 이용한 유효성 검사
 JavaScript를 활용한 동적 입력 필드 추가 기능 구현
 검색 기능 구현 (아티스트명, 작품명 인덱싱)
 exceljs를 이용한 아티스트 및 아트워크 데이터 엑셀 다운로드

 2.4 이미지 및 파일 처리
 다중 이미지 업로드 및 수정 로직 구현
 S3 저장소에서 기존 이미지 삭제 후 새로운 이미지 등록
 이미지 URL 통일화 (MongoDB 저장 URL과 AWS S3 저장 URL 간 인코딩 차이 해결)

 2.5 게시판 및 데이터 관리
 CRUD 기능 구현 (게시글 등록, 수정, 삭제)
 필터 및 정렬 기능 구현
 MongoDB 인덱싱을 활용한 검색 최적화
 mongoose 미들웨어를 활용한 데이터 처리 모듈화

 2.6 UI 및 퍼블리싱
 메인 페이지, 로그인, 회원가입, 네비게이션 UI 퍼블리싱
 관리자 페이지 및 목록 페이지 디자인 개선
 리스트 및 상세 페이지 디자인 적용

 2.7 오류 수정 및 최적화
 동적 UI 삭제 및 값 채우기 시 이벤트 위임 (event delegation)
 JavaScript에서 입력값 길이에 따라 height 자동 조정
 페이지네이션 개선 (커서 기반 페이지네이션 적용)
 데이터 삭제 및 등록 후 redirect URL 수정
 삭제 시 연관 데이터 자동 삭제 (아티스트 삭제 시 등록한 작품도 함께 삭제)
