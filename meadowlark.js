var http = require('http');
var express = require('express');
var fortune = require('./lib/fortune.js');
var formidable = require('formidable');
var app = express();

//设置handlebars模板引擎
var handlebars = require('express3-handlebars').create({defaultLayout: 'main'});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.use(express.static(__dirname + '/public'));

// logging
switch(app.get('env')){
    case 'development':
    	// compact, colorful dev logging
    	app.use(require('morgan')('dev'));
        break;
    case 'production':
        // module 'express-logger' supports daily log rotation
        app.use(require('express-logger')({ path: __dirname + '/log/requests.log'}));
        break;
}


app.use(require('body-parser')());//表单提交,GET or POST

var credentials = require('./credentials.js');
//使用cookie
app.use(require('cookie-parser')(credentials.cookieSecret));//可以在res的地方设置cookie或签名cookie
//使用session
app.use(require('express-session')());

app.set('port', process.env.PORT || 3000);

// PS：每个请求都在一个域中，是一种好的做法，这样除了问题，就能快速找到出问题的地方。
// use domains for better error handling 处理未知的错误；
app.use(function(req, res, next){
    // create a domain for this request
    var domain = require('domain').create();
    // handle errors on this domain
    domain.on('error', function(err){
        console.error('DOMAIN ERROR CAUGHT\n', err.stack);
        try {
            // failsafe shutdown in 5 seconds
            setTimeout(function(){
                console.error('Failsafe shutdown.');
                process.exit(1);
            }, 5000);

            // disconnect from the cluster
            var worker = require('cluster').worker;
            if(worker) worker.disconnect();

            // stop taking new requests
            server.close();

            try {
                // attempt to use Express error route
                next(err);
            } catch(error){
                // if Express error route failed, try
                // plain Node response
                console.error('Express error mechanism failed.\n', error.stack);
                res.statusCode = 500;
                res.setHeader('content-type', 'text/plain');
                res.end('Server error.');
            }
        } catch(error){
            console.error('Unable to send 500 response.\n', error.stack);
        }
    });

    // add the request and response objects to the domain
    domain.add(req);
    domain.add(res);

    // execute the rest of the request chain in the domain
    domain.run(next);
});

//原来的启动，可能是默认的服务器
// app.listen(app.get('port'), function(){
// 	console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl + C to terminate.');
// });

//选择开发模式下启动服务器
// http.createServer(app).listen(app.get('port'), function(){
// 	console.log('Express started in ' + app.get('env') + ', on http://localhost:' + app.get('port') + '; press Ctrl + C to terminate.');
// });

//集群下启动	
function startServer(){
	http.createServer(app).listen(app.get('port'), function(){
		console.log('Express started in ' + app.get('env') + ', on http://localhost:' + app.get('port') + '; press Ctrl + C to terminate.');
	});
}

if(require.main === module) {
	startServer();
} else {
	module.exports = startServer;
}

// flash message middleware
app.use(function(req, res, next){
	// if there's a flash message, transfer
	// it to the context, then clear it
	res.locals.flash = req.session.flash;
	delete req.session.flash;
	next();
});

//测试
// app.use(function(req, res, next){
// 	res.locals.showTests = app.get('env') != 'production' && req.query.test === '1';
// 	next();
// });



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

//表单提交和cookie，session运用
app.get('/newsletter/archive', function(req, res){
	res.render('newsletter/archive');
});

// for now, we're mocking NewsletterSignup:
function NewsletterSignup(){
}
NewsletterSignup.prototype.save = function(cb){
	cb();
};

var VALID_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

app.post('/newsletter', function(req, res){
	console.log(req);
	console.log('!!!!!!!!!!');
	console.log(req.body);
	var name = req.body.name || '', email = req.body.email || '';
	// input validation
	if(!email.match(VALID_EMAIL_REGEX)) {
		if(req.xhr) return res.json({ error: 'Invalid name email address.' });
		req.session.flash = {
			type: 'danger',
			intro: 'Validation error!',
			message: 'The email address you entered was  not valid.',
		};
		return res.redirect(303, '/newsletter/archive');
	}
	new NewsletterSignup({ name: name, email: email }).save(function(err){
		if(err) {
			if(req.xhr) return res.json({ error: 'Database error.' });
			req.session.flash = {
				type: 'danger',
				intro: 'Database error!',
				message: 'There was a database error; please try again later.',
			};
			return res.redirect(303, '/newsletter/archive');
		}
		if(req.xhr) return res.json({ success: true });
		req.session.flash = {
			type: 'success',
			intro: 'Thank you!',
			message: 'You have now been signed up for the newsletter.',
		};
		return res.redirect(303, '/newsletter/archive');
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
    res.render('contest/vacation-photo', { year: now.getFullYear(), month: now.getMonth() });
});
app.post('/contest/vacation-photo/:year/:month', function(req, res){
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files){
        if(err) return res.redirect(303, '/error');
        console.log('received fields:');
        console.log(fields);
        console.log('received files:');
        console.log(files);
        res.redirect(303, '/thank-you');
    });
});

//查看cookie和session
app.get('/cookieAndSession',function(req,res){

	res.cookie('monster', 'nom nom');
	res.cookie('signed_monster', 'nom nom', { signed: true });

	var monster = req.cookies.monster;
	var signed_monster = req.signedCookies.signed_monster;

	console.log(monster);
	console.log(signed_monster);

	//删除
	// res.clearCookie('monster');

	/**
	关于cookie，还有domain，path，maxAge，secure，httpOnly，signed等属性
	*/

	/*
	session全都在请求对象上，
	*/
	console.log(colorScheme);
	req.session.userName = 'Anonymous';
	req.session.colorScheme = 'pink';
	var colorScheme = req.session.colorScheme || dark;

	console.log(colorScheme);

	//删除
	// delete req.session.colorScheme;

	res.render('cookieAndSession');
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