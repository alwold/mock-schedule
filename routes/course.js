exports.createCourse = function(req, res) {
  courseMap = req.body.course;
  course = new Course(courseMap.courseNumber, courseMap.name, courseMap.schedule, courseMap.status);
  if (!global.courses) {
    global.courses = [];
  }
  global.courses.push(course);
  res.render('createCourse', { title: 'Create Course', course: course });
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