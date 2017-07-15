'use strict';

const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const port = process.env.PORT || 8080;
const mongoose = require('mongoose');
const path = require('path');
const favicon = require('serve-favicon');
const breadcrumb = require('express-url-breadcrumb');
const validator = require('validator');
const app = express();

mongoose.Promise = Promise;
mongoose.connect('mongodb://localhost:27017/test');

const Restaurants = require('./models/Restaurants');
const helpers = require('./lib/helpers');
const SingleRestaurant = require('./lib/restaurant');
const Mail = require('./lib/mail');
const config = require('./lib/config');

app.disable('x-powered-by');

app.engine('.hbs', exphbs({
    extname: '.hbs',
    defaultLayout: 'main',
    helpers: helpers
}));

app.set('view engine', '.hbs');
app.set('env', 'development');


app.use(favicon(path.join(__dirname, 'favicon.png')));
app.use('/public', express.static(path.join(__dirname, '/public'), {
  maxAge: 0,
  dotfiles: 'ignore',
  etag: false
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.locals.isSingle = false;
app.locals.apiKey = config.apiKey;


app.get('/', (req, res) => {
  Restaurants.find().limit(9).then(restaurants => {
      res.render('home', {
          pageTitle: 'Restaurants App',
          restaurants: restaurants
      });
  }).catch(err => {
      res.render('error', {
          error: 'Unable to get restaurants',
          pageTitle: 'Error'
      });
  });

});

app.get('/restaurants', (req, res) => {
    Restaurants.find().limit(9).then(restaurants => {
        res.render('restaurants', {
            pageTitle: 'Restaurants',
            restaurants: restaurants
        });
    }).catch(err => {
        res.render('error', {
            error: 'Unable to get restaurants',
            pageTitle: 'Error'
        });
    });

});

app.get('/restaurants/:id', breadcrumb(), (req, res) => {
   if(validator.isNumeric(req.params.id)) {
       Restaurants.findOne({restaurant_id: req.params.id}).then(restaurant => {
           SingleRestaurant.getRelated(
               Restaurants,
               restaurant,
               {
                   borough: restaurant.borough,
                   cuisine: restaurant.cuisine
               }).then(related => {
               res.render('single', {
                   pageTitle: restaurant.name,
                   restaurant: restaurant,
                   related: related,
                   isSingle: true
               });
           }).catch(err => {
               res.render('error', {
                   error: 'Unable to get related restaurants',
                   pageTitle: 'Error'
               });
           });
       }).catch(err => {
           res.render('error', {
               error: 'Unable to get restaurant',
               pageTitle: 'Error'
           });
       });
   } else {
      res.sendStatus(404);
   }
});

app.get('/top-ten', (req, res) => {

    SingleRestaurant.getTop(Restaurants).then(results => {
        res.render('top-ten', {
            pageTitle: 'Top Ten',
            restaurants: results
        });
    }).catch(err => {
        res.render('error', {
            error: 'Unable to get restaurants',
            pageTitle: 'Error'
        });
    });


});

app.post('/search', (req, res) => {
    let q = req.body.q;
    let query = {
        name: { "$regex": q, "$options": "i" }
    };

    Restaurants.find(query).limit(6).then(rests => {
        if(rests && rests.length && rests.length > 0) {
            res.render('search-results', {
                pageTitle: 'Search results',
                restaurants: rests
            });
        } else {
            res.render('search-results', {
                pageTitle: 'Search results',
                restaurants: false
            });
        }
    }).catch(err => {
        res.render('error', {
            error: 'Unable to get restaurants',
            pageTitle: 'Error'
        });
    });

});

app.post('/vote', (req, res) => {
   let id = req.body.id;
   let vote = req.body.vote;
   let grade = req.body.grade;
   let now = new Date();

   let valid = true;
   let grades = 'A,B,C,D,E,F'.split('');

   if(!validator.isMongoId(id)) {
       valid = false;
   }
   if(!validator.isNumeric(vote)) {
       valid = false;
   }
   if(!validator.isInt(vote, {min: 0, max: 100})) {
       valid = false;
   }

   if(grades.indexOf(grade) === -1) {
       valid = false;
   }

   if(!valid) {
       res.sendStatus(403);
   } else {

       let updated = {
           date: now,
           grade: grade,
           score: parseInt(vote, 10)
       };

       Restaurants.findByIdAndUpdate(id, {
           $push: {
               grades: {
                   $each: [updated],
                   $position: 0
               }
           }
       }).then(result => {

           let output = {
               score: vote,
               grade: grade,
               date: now.toLocaleDateString()
           };

           res.json(output);
       }).catch(err => {
           res.status(403).send(err);
       });
   }
});

app.post('/book', (req, res) => {
    let first = req.body.firstname;
    let last = req.body.lastname;
    let email = req.body.email;
    let persons = req.body.persons;
    let date = req.body.datehour;

    let errors = [];

    if(validator.isEmpty(first)) {
        errors.push({
           attr: 'firstname',
           msg: 'Required field'
        });
    }

    if(validator.isEmpty(last)) {
        errors.push({
            attr: 'lastname',
            msg: 'Required field'
        });
    }

    if(!validator.isEmail(email)) {
        errors.push({
            attr: 'email',
            msg: 'Invalid e-mail address'
        });
    }

    if(!validator.isInt(persons, {min: 1, max: 10})) {
        errors.push({
            attr: 'persons',
            msg: 'Invalid number of persons'
        });
    }

    if(!/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(date)) {
        errors.push({
            attr: 'datehour',
            msg: 'Invalid date and hour'
        });
    }

    if(errors.length > 0) {
        res.json({errors: errors});
    } else {
        let options = {
            from: email,
            to: config.adminEmail,
            subject: 'New Booking',
            text: first + ' ' + last + '\n\n' + persons + ' persons on ' + date,
            html: ''
        };
        let mailer = new Mail(options);

        mailer.send().then(ok =>{
            res.json({success: 'Booking sent successfully'});
        }).catch(err =>{
            res.json({errors: [{attr: 'datehour', msg: 'Oops, try again!'}]});
        });
    }
});


if (app.get('env') === 'development') {
  app.use((err, req, res, next) => {
    res.status(err.status || 500);
  });
}

app.use((err, req, res, next) => {
  res.status(err.status || 500);
});

app.listen(port);
