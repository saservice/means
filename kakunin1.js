app.post('/add-comment', (req, res) => {
  const { blog_id, contents } = req.body;
  const errors = [];

  // コメントが空白やスペースのみであるかをチェック
  if (!contents.trim()) {
    errors.push('Contents are empty.');
    // コメントが空の場合はエラーメッセージを返す
    res.render('readblog', { blog_id: blog_id, errors: errors }); // エラーを渡す

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