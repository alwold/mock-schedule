var cache = require('../cache');
var Db = require('mongodb').Db;
var Server = require('mongodb').Server;
var db = new Db('mock-schedule', new Server("127.0.0.1", 27017, {}));

exports.createCourse = function(req, res) {
  courseMap = req.body.course;
  course = new Course(courseMap.term, courseMap.courseNumber, courseMap.name, courseMap.schedule, courseMap.status);
  if (course.term && course.courseNumber && course.name && course.schedule && course.status) {
    db.open(function(error, client) {
      if (error) {
        renderIndex(req, res, error);
      } else {
        client.collection("courses", function(error, coursesCollection) {
          if (error) {
            renderIndex(req, res, error);
          } else {
            var exists = false;
            var cursor = coursesCollection.find().each(function(error, existingCourse) {
              if (error) {
                renderIndex(req, res, error);
              } else if (existingCourse) {
                console.log("existingCourse: "+existingCourse);
                existingCourse.__proto__ = Course.prototype;
                console.log("existing course: "+existingCourse.key());
                if (course.key() == existingCourse.key() && !exists) {
                  console.log("found existing course");
                  renderIndex(req, res, "Course already exists");
                  exists = true;
                }
              } else {
                console.log("null existingCourse");
                // so do they send a blank one at the end so you can do the next action?
                if (!exists) {
                  console.log("no existing course, adding");
                  coursesCollection.insert(course, function(error, docs) {
                    renderIndex(req, res, "Course Added");
                  });
                }
              }
            });
          }
        });
      }
    });
  } else {
    renderIndex(req, res, "Term, course number, name, schedule or status missing");
  }
};

exports.deleteCourse = function(req, res) {
  console.log("delete requested for "+req.params.courseKey);
  cache.memcached.get("courseList", function(err, courseList) {
    if (err) {
      renderIndex(req, res, err);
    } else {
      var index = courseList.indexOf(req.params.courseKey);
      if (index != -1) {
        console.log("operating on courseList: "+JSON.stringify(courseList));
        courseList.splice(index, 1);
        console.log("after courseList: "+JSON.stringify(courseList));
        cache.memcached.set("courseList", courseList, 10000, function(err, result) {
          if (err) {
            renderIndex(req, res, err);
          } else {
            console.log("delete key: "+req.params.courseKey);
            cache.memcached.del(req.params.courseKey, function(err, result) {
              if (err) {
                console.log("got error");
                renderIndex(req, res, err);
              } else {
                console.log("delete worked: "+JSON.stringify(result));
                renderIndex(req, res, "Course deleted");
              }
            });
          }
        });
      } else {
        renderIndex(req, res, "Unable to find course to delete");
      }
    }
  });
};

exports.toggleCourseStatus = function(req, res) {
  cache.memcached.get(req.params.courseKey, function(error, course) {
    if (error) {
      renderIndex(req, res, "Error: "+error);
    } else if (!course) {
      renderIndex(req, res, "Couldn't find course");
    } else {
      course.__proto__ = Course.prototype;
      if (course.status == 'Open') {
        course.status = 'Closed';
      } else {
        course.status = 'Open';
      }
      cache.memcached.set(course.key(), course, 10000, function(error, result) {
        if (error) {
          renderIndex(req, res, "Error: "+error);
        } else {
          renderIndex(req, res, null);
        }
      });
    }
  });
};

exports.getCourseInfo = function(req, res) {
  cache.memcached.get(req.params.courseKey, function(error, course) {
    if (error) {
      res.statusCode = 500;
      res.end();
    } else {
      res.setHeader("Content-type", "text/json");
      res.end(JSON.stringify(course));
    }
  });
};

exports.index = function(req, res) {
  renderIndex(req, res, null);
};

function renderIndex(req, res, message) {
  // get list of courses
  db.open(function(error, client) {
    if (error) {
      res.render('index', { title: 'Mock Schedule', courses: [], message: error});
    } else {
      client.collection("courses", function(error, coursesCollection) {
        if (error) {
          res.render('index', { title: 'Mock Schedule', courses: [], message: error});
        } else {
          var courses = [];
          coursesCollection.find().each(function(error, course) {
            if (error) {
              res.render('index', { title: 'Mock Schedule', courses: [], message: error});
            } else if (course) {
              course.__proto__ = Course.prototype;
              courses.push(course);
            } else {
              res.render('index', { title: 'Mock Schedule', courses: courses, message: message });
            }
          });
        }
      });
    }
  });
}

function Course(term, courseNumber, name, schedule, status) {
  this.term = term;
  this.courseNumber = courseNumber;
  this.name = name;
  this.schedule = schedule;
  this.status = status;
}

Course.prototype.toString = function() {
  return "Course: ["+this.term+", "+this.courseNumber+", "+this.name+", "+this.schedule+", "+this.status+"]";
};

Course.prototype.key = function() {
  return this.term+':'+this.courseNumber;
};
