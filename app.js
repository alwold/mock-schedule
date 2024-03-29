
/**
 * Module dependencies.
 */

var express = require('express'),
  routes = require('./routes'),
  course = require('./routes/course');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/', course.index);
app.post('/course', course.createCourse);
app.get('/course/:courseKey/delete', course.deleteCourse);
app.get('/course/:courseKey/toggle', course.toggleCourseStatus);
app.get('/course/:courseKey', course.getCourseInfo);

app.listen(3001, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
