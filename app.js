const http = require("http");
const express = require("express");
const dotenv = require("dotenv");
const { DataSource } = require("typeorm"); //타입ORM 객체 생성
const mysql = require("mysql2");
const { errorMonitor } = require("events");
const cors = require("cors");
const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
dotenv.config();

const myDataSource = new DataSource({
  type: process.env.TYPEORM_CONNECTION,
  host: process.env.TYPEORM_HOST,
  port: process.env.TYPEORM_PORT,
  username: process.env.TYPEORM_USERNAME,
  password: process.env.TYPEORM_PASSWORD,
  database: process.env.TYPEORM_DATABASE,
});

const app = express();

app.use(cors());
app.use(express.json()); // for parsing application/json

//signUp
const signup = async (req, res) => {
  const { email, password, name } = req.body;
  try {
    //예외 처리
    // 예외1. ID,PW,이름까지 입력을 완료 하였는지
    if (email === undefined || password === undefined || name === undefined) {
      const error = new Error("KEY_ERROR");
      error.statusCode = 400;
      throw error;
    }
    // 예외2. 이미 가입 되어있는 사용자인지
    const user_db = myDataSource.query(
      `SELECT * FROM users WHERE email = '${email}';`
    );
    if (user_db.length == 0) {
      const error = new Error("Duplicate_user");
      error.statusCode = 400;
      throw error;
    }
    // 예외3. 비밀번호 조건을 완료했는지 (길이는 8자 이상, 특수문자 포함)
    const blank_pattern = /^\s+|\s+$/g;
    const special_pattern = /[`~!@#$%^&*|\\\'\";:\/?]/gi;
    if (
      password.length < 8 &&
      !special_pattern.test(password) &&
      blank_pattern.test(password)
    ) {
      const error = new Error("Invalid_password");
      error.statusCode = 400;
      throw error;
    }
    //비밀번호 암호화
    const en_pw = bcrypt.hashSync(password, 10);

    //user signup DB로 전달
    const signup_DB = myDataSource.query(`
    INSERT INTO users (    
        email,
        name,
        password)
    VALUE(    
    '${email}',
    '${name}',
    '${en_pw}')
    `);

    console.log("sign up id : ", signup_DB);
    return res.status(200).json({
      "message ": "userCreated", //정상적으로 생성 되었음을 알려줌
    });
  } catch (error) {
    console.log(error);
    return res.status(error.statusCode).json({
      "message ": error.message,
    });
  }
};

//signIn
const signIn = async (req, res) => {
  const { email, password } = req.body;
  try {
    //예외 처리
    // 예외1. 이메일과 password 정상적으로 전송 되었는지
    if (email === undefined || password === undefined) {
      const error = new Error("KEY_ERROR");
      error.statusCode = 400;
      throw error;
    }
    // 예외2. 이메일이 존재하지 않을 때
    const user_db = await myDataSource.query(
      `SELECT * FROM users WHERE email = '${email}';`
    );
    if (user_db.length == 0) {
      const error = new Error("User_non_existent");
      error.statusCode = 400;
      throw error;
    }
    // 예외3. 비밀번호가 같지 않을 때
    // 입력 받은 암호 암호화

    // const encrypt_pw = bcrypt.hashSync(password, 10);
    // console.log(user_db[0].password);
    // console.log(encrypt_pw);

    if (user_db[0].password != password) {
      const error = new Error("Password_Not_Corect");
      error.statusCode = 400;
      throw error;
    }
    // 토큰 생성하기
    // const token = jwt.sign({ id: email }, "sceret key");
    console.log("LOGIN_SUCCESS : ", user_db);
    return res.status(200).json({
      message: "LOGIN_SUCCESS",
    });
  } catch (err) {
    console.log(err);
    // return res.status(err.statusCode).json({
    //   "message ": error.message,
    // });
  }
};
app.post("/users/signup", signup);
app.post("/users/login", signIn);

const server = http.createServer(app); // express app 으로 서버를 만듭니다.

const start = async () => {
  // 서버를 시작하는 함수입니다.
  try {
    server.listen(8001, () => console.log(`Server is listening on 8001`));
  } catch (error) {
    console.error(error);
  }
};

myDataSource
  .initialize() //서버와 DB를 연결해 준다!
  .then(() => {
    console.log("Data Source has been initialized!");
  });

start();
