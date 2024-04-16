app.post('/delete', (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  
  // エラー配列の初期化
  const errors = [];

  // 入力値の検証
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

  // エラーがある場合はエラーメッセージをレンダリング
  if (errors.length > 0) {
    res.render('delete', { errors: errors });
  } else {
    // 削除クエリを定義
    const deleteQuery = 'DELETE FROM users WHERE id = ?';
    
    // セッションから userId を取得
    const userId = req.session.userId;

    // パスワードのハッシュ化
    bcrypt.hash(password, 10, (error, hash) => {
      if (error) {
        console.error('Error during delete account:', error);
        res.status(500).send('An error occurred during signup. Please try again later.');
      } else {
        // ハッシュ化が完了したらユーザーを削除
        db.run(deleteQuery, [userId], function (err) {
          if (err) {
            console.error('Error during delete account:', err);
            res.status(500).send('An error occurred during delete account. Please try again later.');
          } else {
            res.redirect('/');
          }
        });
      }
    });
  }
});

