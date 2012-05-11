var cache = require('../cache');
var Db = require('mongodb').Db;
var Server = require('mongodb').Server;
var ObjectID = require('mongodb').ObjectID;
var db = new Db('mock-schedule', new Server("127.0.0.1", 27017, {}));

exports.createCourse = function(req, res) {
  courseMap = req.body.course;
  course = new Course(courseMap.term, courseMap.courseNumber, courseMap.name, courseMap.schedule, courseMap.status);
  if (course.term && course.courseNumber && course.name && course.schedule && course.status) {
    db.open(function(error, client) {
      if (error) {
        db.close();
        renderIndex(req, res, error);
      } else {
        client.collection("courses", function(error, coursesCollection) {
          if (error) {
            db.close();
            renderIndex(req, res, error);
          } else {
            var exists = false;
            var cursor = coursesCollection.find().each(function(error, existingCourse) {
              if (error) {
                db.close();
                renderIndex(req, res, error);
              } else if (existingCourse) {
                console.log("existingCourse: "+existingCourse);
                existingCourse.__proto__ = Course.prototype;
                console.log("existing course: "+existingCourse.key());
                if (course.key() == existingCourse.key() && !exists) {
                  console.log("found existing course");
                  db.close();
                  renderIndex(req, res, "Course already exists");
                  exists = true;
                }
              } else {
                console.log("null existingCourse");
                // so do they send a blank one at the end so you can do the next action?
                if (!exists) {
                  console.log("no existing course, adding");
                  coursesCollection.insert(course, function(error, docs) {
                    db.close();
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
  db.open(function(error, client) {
    if (error) {
      renderIndex(req, res, error);
    } else {
      client.collection("courses", function(error, coursesCollection) {
        if (error) {
          renderIndex(req, res, error);
        } else {
          coursesCollection.remove({_id: ObjectID(req.params.courseKey)}, function(error, object) {
            console.log("callback: object = "+object);
            db.close();
            if (error) {
              renderIndex(req, res, error);
            } else {
              renderIndex(req, res, "Deleted");
            }
          });
        }
      });
    }
  });
};

exports.toggleCourseStatus = function(req, res) {
  collectionAction(function(coursesCollection) {
    console.log("toggling "+req.params.courseKey);
    coursesCollection.findOne({_id: new ObjectID(req.params.courseKey)}, function(error, course) {
      if (error) {
        db.close();
        renderIndex(req, res, error);
      } else if (course) {
         if (course.status == "Open") {
           course.status = "Closed";
         } else {
           course.status = "Open";
         }
         console.log("status is now "+course.status);
         coursesCollection.save(course, {safe: true}, function(error, course) {
           db.close();
           if (error) {
             renderIndex(req, res, error);
           } else {
             renderIndex(req, res, null);
           }
         });
      } else {
        db.close();
        renderIndex(req, res, "Couldn't find course to toggle");
      }
    });
  });
};

exports.getCourseInfo = function(req, res) {
  collectionAction(function(coursesCollection) {
    var termAndCourseNumber = req.params.courseKey.split(":");
    coursesCollection.findOne({term: termAndCourseNumber[0], courseNumber: termAndCourseNumber[1]}, function(error, course) {
      db.close();
      if (error) {
        res.statusCode = 500;
        res.end();
      } else {
        res.setHeader("Content-type", "text/plain");
        res.end(JSON.stringify(course));
      }
    });
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
              db.close();
            }
          });
        }
      });
    }
  });
}

function collectionAction(action) {
  db.open(function(error, client) {
    if (error) {
      db.close();
      renderIndex(req, res, error);
    } else {
      client.collection("courses", function(error, coursesCollection) {
        if (error) {
          db.close();
          renderIndex(req, res, error);
        } else {
          action(coursesCollection);
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
