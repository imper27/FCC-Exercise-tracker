const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const cors = require('cors');

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI);

app.use(cors());

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const Schema = mongoose.Schema;
const userSchema = new Schema({
  username: String,
  exercises: {type: [{
    description: String,
    duration: Number,
    date: {type: Date, default: new Date()}
  }], default: []}
});

let User = mongoose.model('User', userSchema);

app.post('/api/exercise/new-user', (request, response) => {
  let username = request.body.username;
  let user = new User({username});
  user.save((error, shortData) => {
      if (error) {
        console.log(error);
        response.json({problem: 'sorry'});
      } else {
        response.json({username, _id: user._id});
      }
    }); //save
});

app.post('/api/exercise/add', (request, response) => {
  let _id = request.body.userId;
  let description = request.body.description;
  let duration = request.body.duration;
  let exercise = {description, duration};
  let date = request.body.date;
  if (date) {
    exercise.date = new Date(date);
  } else {
    exercise.date = new Date();
  }
  
  // console.log(exercise);
  
  User.findOneAndUpdate({_id}, {$push: {exercises: exercise}}, {new: true}, (error, user) => {
    if (error) {
      console.log(error.message);
      response.json({problem: 'sorry'});
    }  else {
      response.json({username: user.username, _id: user._id, description, duration, date: exercise.date});
    }
  });

});

app.get('/api/exercise/users', (request, response) => {
  User.find({}, 'username _id', (error, users) => {
      if (error) {
        console.log(error);
        response.json({problem: 'sorry'});
      } else {
        users = users.map(user => ({username: user.username, _id: user._id}));
        response.json({users});
      }
    }); //save
});

app.get('/api/exercise/log', (request, response) => {
  let _id = request.query.userId;
  console.log(_id);
  let from = request.query.from;
  let to = request.query.to;
  User.findById(_id, (error, user) => {
    if (error) {
        console.log(error);
        response.json({problem: 'sorry'});
      } else {
        let username = user.username;
        let log = user.exercises;
        if (from) {
          log = log.filter(exercise => exercise.date >= new Date(from));
        }
        
        if (to) {
          log = log.filter(exercise => exercise.date <= new Date(to));
        }
        
        let count = log.length;
        response.json({_id, username, log, count});
      }   
  })
});


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || 'Internal Server Error';
  }
  res.status(errCode).type('txt')
    .send(errMessage);
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
