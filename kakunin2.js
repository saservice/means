app.post('/delete', (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const query = 'SELECT * FROM users WHERE (username, email, password) VALUES (?, ?, ?)';

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
    res.render('delete', { errors: errors });
  } else {
    const deleteQuery = 'DELETE FROM users WHERE id = ?';
    const userId = req.session.userId;

    bcrypt.hash(password, 10, (error, hash) => {
      if (error) {
        console.error('Error during delete account:', error);
        res.status(500).send('An error occurred during signup. Please try again later.');
      } else {
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