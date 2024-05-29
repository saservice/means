app.post('/add-comment', (req, res) => {
  const { blog_id, content } = req.body;
  const errors = [];

  // コメントが空白やスペースのみであるかをチェック
  if (!content.trim()) {
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

  const query = 'INSERT INTO comments (blog_id, content) VALUES (?, ?)';
  db.run(query, [blog_id, content], (err) => {
    if (err) {
      console.error('Error adding comment:', err);
      res.status(500).send('Internal Server Error');
    } else {
      // コメントの追加が成功した場合は、該当のブログ記事の表示ページにリダイレクトする
      res.redirect('/readblog/' + blog_id);
    }
  });
});