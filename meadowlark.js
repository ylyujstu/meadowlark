var express = require('express');
var fortune = require('./lib/fortune.js');
var app = express();

//设置handlebars模板引擎
var handlebars = require('express3-handlebars').create({defaultLayout: 'main'});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.use(express.static(__dirname + '/public'));
app.use(require('body-parser')());//表单提交,GET or POST
app.set('port', process.env.PORT || 3000);

app.listen(app.get('port'), function(){
	console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl + C to terminate.');
});

//测试
app.use(function(req, res, next){
	res.locals.showTests = app.get('env') != 'production' && req.query.test === '1';
	next();
});



/* 路由
 * 1.忽略了大小写
 * 2.不考略查询字符
 * 3.先后顺序，会相互覆盖
 */
app.get('/', function(req, res){
	res.render('home');
});

app.get('/about', function(req, res){
	res.render('about', { 
		fortune: fortune.getFortune()
	});
});

//报头信息
app.get('/headers', function(req, res){
	res.set('Content-Type', 'text/plain');
	var s = '';
	for (var name in req.headers)
		s += name + ':' + req.headers[name] + '\n';
	res.send(s);
});

//表单提交
app.get('/newsletter', function(req, res){
	res.render('newsletter', {
		csrf: 'CSRF token goes here.'
	});
});

app.post('/process', function(req, res){
	// console.log('From (from querystring: ' + req.query.form);
	// console.log('CSRF token (from hidden from field): ' + req.body._csrf);
	// console.log('Name (from visible form field): ' + req.body.name);
	// console.log('Email (from  visible form field): ' + req.body.email);
	
	if(req.xhr || req.accepts('json,html')==='json'){
        // if there were an error, we would send { error: 'error description' }
        res.send({ success: true });
    } else {
        // if there were an error, we would redirect to an error page
        res.redirect(303, '/thank-you');
    }
});

//文件上传
app.get('/contest/vacation-photo', function(req, res){
	var now = new Date();
	res.render('contest/vacation-photo', {
		year: now.getFullYear(),
		month: now.getMonth()
	});
});

//感谢页面
app.get('/thank-you', function(req, res){
	res.render('thank-you');
});

//定制404
app.use(function(req, res){
	res.status(404);
	res.render('404');
});

//定制500
app.use(function(err, req, res, next){
	console.error(err.stack);
	res.status(500);
	res.render('500');
});