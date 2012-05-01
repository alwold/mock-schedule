var cache = require('../cache');

exports.createCourse = function(req, res) {
  courseMap = req.body.course;
  course = new Course(courseMap.courseNumber, courseMap.name, courseMap.schedule, courseMap.status);
  if (course.courseNumber && course.name && course.schedule && course.status) {
    cache.memcached.get("courseList", function(err, result) {
      if (err) {
        renderIndex(req, res, err);
      } else {
        if (result && result.indexOf(course.courseNumber) != -1) {
          renderIndex(req, res, "Course already exists");
        } else {
          if (result) {
            result.push(course.courseNumber);
          } else {
            result = [course.courseNumber];
          }
          cache.memcached.set("courseList", result, 10000, function(err, result) {
            // add the course
            cache.memcached.set(course.courseNumber, course, 10000, function(err, result){
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
    renderIndex(req, res, "Course number, name, schedule or status missing");
  }
};

exports.deleteCourse = function(req, res) {
  console.log("delete requested for "+req.params.courseNumber);
  cache.memcached.get("courseList", function(err, courseList) {
    if (err) {
      renderIndex(req, res, err);
    } else {
      var index = courseList.indexOf(req.params.courseNumber);
      if (index != -1) {
        console.log("operating on courseList: "+JSON.stringify(courseList));
        courseList.splice(index, 1);
        console.log("after courseList: "+JSON.stringify(courseList));
        cache.memcached.set("courseList", courseList, 10000, function(err, result) {
          if (err) {
            renderIndex(req, res, err);
          } else {
            console.log("delete key: "+req.params.courseNumber);
            cache.memcached.del(req.params.courseNumber, function(err, result) {
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
  if (global.courses) {
    for (var i = 0; i < global.courses.length; i++) {
      if (global.courses[i].courseNumber == req.params.courseNumber) {
        if (global.courses[i].status == 'Open') {
          global.courses[i].status = 'Closed';
        } else {
          global.courses[i].status = 'Open';
        }
      }
    }
  }
  res.render('index', { title: 'Mock Schedule', courses: global.courses });
};

exports.getCourseInfo = function(req, res) {
  if (global.courses) {
    for (var i = 0; i < global.courses.length; i++) {
      if (global.courses[i].courseNumber == req.params.courseNumber) {
        res.setHeader("Content-type", "text/json");
        res.end(JSON.stringify(global.courses[i]));
      }
    }
  }
};

exports.index = function(req, res) {
  renderIndex(req, res, null);
}

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

function Course(courseNumber, name, schedule, status) {
  this.courseNumber = courseNumber;
  this.name = name;
  this.schedule = schedule;
  this.status = status;
}

Course.prototype.toString = function() {
  return "Course: ["+this.courseNumber+", "+this.name+", "+this.schedule+", "+this.status+"]";
};