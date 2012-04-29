
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Mock Schedule', courses: global.courses });
};
