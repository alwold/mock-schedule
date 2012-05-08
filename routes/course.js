var cache = require('../cache');

exports.createCourse = function(req, res) {
  courseMap = req.body.course;
  course = new Course(courseMap.term, courseMap.courseNumber, courseMap.name, courseMap.schedule, courseMap.status);
  if (course.term && course.courseNumber && course.name && course.schedule && course.status) {
    cache.memcached.get("courseList", function(err, result) {
      if (err) {
        renderIndex(req, res, err);
      } else {
        if (result && result.indexOf(course.key()) != -1) {
          renderIndex(req, res, "Course already exists");
        } else {
          if (result) {
            result.push(course.key());
          } else {
            result = [course.key()];
          }
          cache.memcached.set("courseList", result, 10000, function(err, result) {
            // add the course
            cache.memcached.set(course.key(), course, 10000, function(err, result){
              if (err) {
                renderIndex(req, res, err);
              } else {
                renderIndex(req, res, "Course Added");
              }
            });
          });
        }
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
  cache.memcached.get("courseList", function(err, courseList) {
    if (err) {
      res.render('index', { title: 'Mock Schedule', courses: [], message: "Error loading courses: "+err});
    } else if (!courseList) {
      res.render('index', { title: 'Mock Schedule', courses: [], message: null});
    } else {
      console.log("coursEList is "+JSON.stringify(courseList));
      var courses = [];
      var i = 0;
      var getNextCourse = function getNextCourse() {
        console.log("getting course #"+i);
        cache.memcached.get(courseList[i], function(err, course) {
          console.log("in callback");
          if (err) {
            console.log("Error getting "+courseList[i]+": "+err);
          } else if (!course) {
            console.log("course "+courseList[i]+" is missing");
          } else {
            console.log("result is "+course);
            console.log("result.courseNumber is "+course.courseNumber);
            course.__proto__ = Course.prototype;
            courses.push(course);
          }
          i++;
          if (i < courseList.length) {
            getNextCourse();
          } else {
            console.log("rendering with "+courses.length+" courses");
            res.render('index', { title: 'Mock Schedule', courses: courses, message: message });
          }
        });
      };
      if (courseList.length > 0) {
        getNextCourse();
      } else {
        res.render('index', { title: 'Mock Schedule', courses: courses, message: message });
      }
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
