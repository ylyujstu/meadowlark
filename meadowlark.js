var express = require('express');

var app = express();

//设置handlebars模板引擎
var handlebars = require('express3-handlebars').create({defaultLayout: 'main'});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.use(express.static(__dirname + '/public'));
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
<<<<<<< HEAD
<<<<<<< HEAD

	res.render('about', { 
		fortune: fortune.getFortune(), 
		pageTestScript: '/qa/tests-about.js'
	});
=======
	res.render('about')
>>>>>>> parent of 2b9bf4b... add fortune module
=======
	res.render('about')
>>>>>>> parent of 2b9bf4b... add fortune module
});

//报头信息
app.get('/headers', function(req, res){
	res.set('Content-Type', 'text/plain');
	var s = '';
	for (var name in req.headers)
		s += name + ':' + req.headers[name] + '\n';
	res.send(s);
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