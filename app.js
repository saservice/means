const express = require("express");
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
const http = require("http");
const server = http.createServer(app);
const PORT = 3000;
const session = require('express-session');
const bcrypt = require('bcrypt');
const mongoose = require("mongoose");

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./contents.db', sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the contents database.');
});

app.set("view engine", "ejs");
app.use('/public', express.static('public'));


server.listen(PORT, () => {
  console.log("listening on 3000");
});


app.use(
  session({
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: false,
  })
);

app.use((req, res, next) => {
  if (req.session.userId === undefined) {
    console.log('You are not logged in.');
    res.locals.username = "gest";
    res.locals.isLoggedIn = false;
  } else {
    console.log('You are logged in.');
    res.locals.username = req.session.username;
    res.locals.isLoggedIn = true;
  }
  next();
});

app.get("/", (req, res) => {
  db.all("SELECT * FROM blog", (err, data) => {
    if (err) {
      console.log("err");
    } else {
      res.render('home', { blog: data }); // blog データを渡す
    }
  });
});

//記事のタイトル表示
app.get('/blog', (req, res) => {
  db.all("SELECT * FROM blog", (err, data) => {
    if (err) {
      console.log("err");
    } else {
      res.render('blog', { blog: data }); // blog データを渡す
    }
  });
});


//記事の表示
app.get('/readblog/:id', (req, res) => {
  //:idはblog.ejsファイルのaタグでクリックした記事のidが入っている
  const blogId = req.params.id;
  // データベースから記事を取得するクエリ
  const query = 'SELECT * FROM blog WHERE id = ?';
  db.get(query, [blogId], (err, row) => {
    //db.getを実行したことでblogIdがqueryのWHERE id = ? の ?(プレースホルダー) に該当することが確定する
    if (err) {
      console.error('Error fetching blog by ID:', err);
      res.status(500).send('Internal Server Error');
    } else {
      if (row) {
        // 記事が見つかった場合
        res.render('readblog', { blog: row });
        //readblogにrow(id番目の記事の情報（カラム）を渡している)
      }
    }
  });
});

app.get('/login', (req, res) => {
  res.render('login.ejs', { errors: [] });

});

app.post('/login', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const query = 'SELECT * FROM users WHERE email = ?';

  const errors = [];

  if (!email || !password) {
    errors.push('Username and password are required.');
    res.render('login', { errors: errors }); // エラーを渡す
    return;
  }

  db.get(query, [email], (err, results) => {
    if (err) {
      console.log('Database error:', err);
      res.status(500).send('An error occurred while retrieving login information.');
      return;
    }

    if (results) {
      bcrypt.compare(password, results.password, (err, passwordMatch) => {
        if (err) {
          console.log('Password comparison error:', err);
          res.status(500).send('An error occurred while comparing login information.');
          return;
        }

        if (passwordMatch) {
          console.log('Login Success');
          req.session.userId = results.id;
          req.session.username = results.username;
          res.redirect('/');
        } else {
          console.log('Password is incorrect.');
          errors.push('Username, password, or both are incorrect.');
          res.render('login', { errors: errors }); // エラーを渡す
        }
      });
    } else {
      console.log('User not found');
      errors.push('Username, password, or both are incorrect.');
      res.render('login', { errors: errors }); // エラーを渡す
    }
  });
});


app.get('/signup', (req, res) => {
  res.render('signup', { errors: [] });
});

app.post('/signup', (req, res, next) => {
  console.log('Empty check of input values');
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;

  const errors = [];

  if (username === '') {
    errors.push('User name is empty.');
  }
  if (email === '') {
    errors.push('Email is empty.');
  }
  if (password === '') {
    errors.push('Password is empty.');
  }

  console.log(errors);

  if (errors.length > 0) {
    res.render('signup.ejs', { errors: errors });
  } else {
    next();
  }
},
  (req, res, next) => {
    console.log('Check for duplicate email addresses');
    const email = req.body.email;
    const query = 'SELECT * FROM users WHERE email = ?'
    const errors = [];

    db.get(query, [email], (error, results) => {
      if (results) {
        errors.push('Sign up failed.');
        res.render('signup.ejs', { errors: errors });
      } else {
        next();
      }
    }
    );
  },
  (req, res) => {
    console.log('sign up');
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
    bcrypt.hash(password, 10, (error, hash) => {
      db.run(query, [username, email, hash], function (err) {
        if (err) {
          console.error('Error during signup:', err);
          res.status(500).send('An error occurred during signup. Please try again later.');
        } else {
          req.session.userId = this.lastID;
          req.session.username = username;
          res.redirect('/');
        }
      });
    });
  });


app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.get('/delete', (req,res) => {
  res.render('delete', { errors: [] });
});

app.post('/delete', (req, res) => {
    const deleteQuery = 'DELETE FROM users WHERE id = ?';
    const userId = req.session.userId;
    db.run(deleteQuery, [userId], function (err) {
      if (err) {
        console.error('Error during delete account:', err);
        res.status(500).send('An error occurred during delete account. Please try again later.');
      } else {
        res.redirect('/');
      }
    });
});

