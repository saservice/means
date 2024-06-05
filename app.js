import express from 'express';
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
const http = require("http");
const server = http.createServer(app);
const PORT = process.env.PORT || 3000; // 環境変数PORTを使用するように変更
const session = require('express-session');
const bcrypt = require('bcrypt');
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

//セッションIDの受け渡し
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

//ホーム画面の表示
app.get("/", (req, res) => {
  res.render('home');
});

//archives記事のタイトル表示
app.get('/archives', (req, res) => {
  db.all("SELECT * FROM archives", (err, data) => {
    if (err) {
      console.log("err");
    } else {
      res.render('archives', { archives: data }); // archives データを渡す
    }
  });
});

//archives記事の表示
app.get('/readarchive/:id', (req, res) => {
  const archiveId = req.params.id;
  const query = 'SELECT * FROM archives WHERE id = ?';
  db.get(query, [archiveId], (err, archive) => {
      if (err) {
          console.error('Error fetching archive by ID:', err);
          res.status(500).send('Internal Server Error');
      } else {
          if (archive) {
              // 記事が見つかった場合
            if (err) {
                console.error('Error fetching comments by blog ID:', err);
                res.status(500).send('Internal Server Error');
            } else {
              res.render('readarchive', { archive: archive});

            }
              
          } else {
              // 記事が見つからない場合はエラーを表示
              res.status(404).send('Blog not found');
          }
      }
  });
});

app.get('/readblog/:id', (req, res) => {
  const blogId = req.params.id;
  const query = 'SELECT * FROM blog WHERE id = ?';
  const errors = [];
  db.get(query, [blogId], (err, blog) => {
      if (err) {
          console.error('Error fetching blog by ID:', err);
          res.status(500).send('Internal Server Error');
      } else {
          if (blog) {
              // 記事が見つかった場合
              db.all("SELECT * FROM comments WHERE blog_id = ?", [blogId], (err, comments) => {
                  if (err) {
                      console.error('Error fetching comments by blog ID:', err);
                      res.status(500).send('Internal Server Error');
                  } else {
                    res.render('readblog', { blog: blog, comments: comments, userId: req.session.userId, errors:errors});
                  }
              });
          } else {
              // 記事が見つからない場合はエラーを表示
              res.status(404).send('Blog not found');
          }
      }
  });
});




//blog記事のタイトル表示
app.get('/blog', (req, res) => {
  db.all("SELECT * FROM blog", (err, data) => {
    if (err) {
      console.log("err");
    } else {
      res.render('blog', { blog: data }); // blog データを渡す
    }
  });
});

//blog記事の表示
app.get('/readblog/:id', (req, res) => {
  const blogId = req.params.id;
  const query = 'SELECT * FROM blog WHERE id = ?';
  db.get(query, [blogId], (err, blog) => {
      if (err) {
          console.error('Error fetching blog by ID:', err);
          res.status(500).send('Internal Server Error');
      } else {
          if (blog) {
              // 記事が見つかった場合
              db.all(query, [blogId], (err, comments) => {
                  if (err) {
                      console.error('Error fetching comments by blog ID:', err);
                      res.status(500).send('Internal Server Error');
                  } else {
                    res.render('readblog', { blog: blog, comments: comments, error: null });

                  }
              });
          } else {
              // 記事が見つからない場合はエラーを表示
              res.status(404).send('Blog not found');
          }
      }
  });
});


// //コメントの追加•リダイレクト
app.post('/add-comment', (req, res) => {
  const { blog_id, contents } = req.body;
  const errors = [];

  // コメントが空白やスペースのみであるかをチェック
  if (!contents.trim()) {
    errors.push('Contents are empty.');
    // コメントが空の場合はエラーメッセージを返す
    const query = 'SELECT * FROM blog WHERE id = ?';
    db.get(query, [blog_id], (err, blog) => {
      if (err) {
        console.error('Error fetching blog by ID:', err);
        res.status(500).send('Internal Server Error');
      } else {
        if (blog) {
          db.all("SELECT * FROM comments WHERE blog_id = ?", [blog_id], (err, comments) => {
            if (err) {
              console.error('Error fetching comments by blog ID:', err);
              res.status(500).send('Internal Server Error');
            } else {
              res.render('readblog', { blog: blog, comments: comments, userId: req.session.userId, errors: errors });
            }
          });
        } else {
          // 記事が見つからない場合はエラーを表示
          res.status(404).send('Blog not found');
        }
      }
    });
    return;
  }
  // username をリクエストに追加
  req.body.username = res.locals.username;

  const query = 'INSERT INTO comments (blog_id, username, contents) VALUES (?, ?, ?)';
  db.run(query, [blog_id, req.body.username, contents], (err) => {
    if (err) {
      console.error('Error adding comment:', err);
      res.status(500).send('Internal Server Error');
    } else {
      // コメントの追加が成功した場合は、該当のブログ記事の表示ページにリダイレクトする
      res.redirect('/readblog/' + blog_id);
    }
  });
});


//ログイン画面遷移
app.get('/login', (req, res) => {
  res.render('login.ejs', { errors: [] });

});

//ログイン処理
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

//ユーザー登録画面遷移
app.get('/signup', (req, res) => {
  res.render('signup', { errors: [] });
});

//ユーザー登録処理
app.post('/signup', (req, res, next) => {
  console.log('Empty check of input values');
  const { username, email, password } = req.body;

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
    const query = 'SELECT * FROM users WHERE email = ?';
    const errors = [];

    db.get(query, [email], (error, results) => {
      if (results) {
        const errors = ['Your email address is already registered.'];
        res.render('signup.ejs', { errors: errors });
      } else {
        next();
      }
    }
    );
  },
  (req, res) => {
    console.log('sign up');
    const { username, email, password } = req.body;
    const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
  
    bcrypt.hash(password, 10, (error, hash) => {
      if (error) {
        console.error('Error during password hashing:', error);
        res.status(500).send('An error occurred during signup. Please try again later.');
        return;
      }
  
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

//ログアウト処理
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

//blog•archivesのpost処理
app.get('/post', (req, res) => {
  res.render('post');
});

app.post('/postarchives', (req, res) => {
  const { name, text, image1, image2, image3 } = req.body;
  const query = 'INSERT INTO archives (name, text, image1, image2, image3) VALUES (?, ?, ?, ?, ?)';
  db.run(query, [name, text, image1, image2, image3], function(err) {
    if (err) {
      console.error('Error adding archives:', err);
      res.status(500).send('Internal Server Error');
    } else {
      const archive_id = this.lastID;
      res.redirect('/readarchive/' + archive_id);
    }
  });
});

app.post('/postblog', (req, res) => {
  const { title, text, image1, image2, image3 } = req.body;
  const query = 'INSERT INTO blog (title, text, image1, image2, image3) VALUES (?, ?, ?, ?, ?)';
  db.run(query, [title, text, image1, image2, image3], function(err) {
    if (err) {
      console.error('Error adding blog:', err);
      res.status(500).send('Internal Server Error');
    } else {
      const blog_id = this.lastID;
      res.redirect('/readblog/' + blog_id);
    }
  });
});



//アカウント削除画面
app.get('/delete', (req,res) => {
  res.render('delete', { errors: [] });
});
//アカウント削除処理
app.post('/delete', (req, res) => {
  const query = 'DELETE FROM users WHERE id = ?';
  const userId = req.session.userId;
  db.run(query, [userId], function (err) {
      if (err) {
          console.error('Error during delete account:', err);
          res.status(500).send('An error occurred during delete account. Please try again later.');
      } else {
          // セッションを破棄してからリダイレクト
          req.session.destroy((err) => {
              if (err) {
                  console.error('Error during session destruction:', err);
                  res.status(500).send('An error occurred during session destruction. Please try again later.');
              } else {
                  res.redirect('/');
              }
          });
      }
  });
});


