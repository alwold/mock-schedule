exports.createCourse = function(req, res) {
  courseMap = req.body.course;
  course = new Course(courseMap.courseNumber, courseMap.name, courseMap.schedule, courseMap.status);
  if (!global.courses) {
    global.courses = [];
  }
  var error = null;
  if (course.courseNumber && course.name && course.schedule && course.status) {
    var alreadyExists = false;
    // make sure it's not already there
    for (var i = 0; i < global.courses.length; i++) {
      if (global.courses[i].courseNumber == course.courseNumber) {
        alreadyExists = true;
        break;
      }
    }
    if (!alreadyExists) {
      global.courses.push(course);
    } else {
      error = "Course already exists";
    }
  } else {
    error = "Course number, name, schedule or status missing";
  }
  res.render('createCourse', { title: 'Create Course', course: course, error: error });
};

exports.deleteCourse = function(req, res) {
  var deleted = false;
  if (global.courses) {
    for (var i = 0; i < global.courses.length; i++) {
      if (global.courses[i].courseNumber == req.params.courseNumber) {
        global.courses.splice(i, 1);
        deleted = true;
        i--; // redo this i, because it will have shifted
      }
    }
  }
  res.render('index', { title: 'Courses', courses: global.courses, message: deleted ? 'Deleted' : 'Couldn\'t find course to delete' });
};

function Course(courseNumber, name, schedule, status) {
  this.courseNumber = courseNumber;
  this.name = name;
  this.schedule = schedule;
  this.status = status;
}

Course.prototype.toString = function() {
  return "Course: ["+this.courseNumber+", "+this.name+", "+this.schedule+", "+this.status+"]";
};