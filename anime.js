var express = require('express');
var app = express();
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');

// Config
var port = process.env.PORT | 8888;

// Route
app.get('/anime', listAnime);
app.get('/anime/:name', watchAnime);

// Controller
function listAnime(req, res) {
	var page = req.query.page || '0';
	var url = 'http://animeindo.web.id/page/' + page;
	var host = req.get('host');

	request(url, function(error, response, html) {
		if (!error) {
			var $ = cheerio.load(html);
			var datas = [];
			var title, thumbnail, uploaded, detail, image, url;
			var data = $('#episodes').children('.episode');

			data.each(function(index, el) {
				detail = $(this).children('.episode-details');
				image = $(this).children('.episode-image').children('a');

				title = detail.children('h3').text();
				uploaded = detail.children('div').children('.episode-meta').text();
				thumbnail = image.children('.primary').attr('src');
				url = req.protocol + '://' + host + '/anime/' + image.attr('href').split('/')[5];

				datas.push({
					title: title,
					uploaded: uploaded,
					thumbnail: thumbnail,
					url: url
				});
			});
		    res.status(200).json(datas);
		} else {
		    res.status(403).json({status: false, message: 'Page error!'});
		}
	});
}

function watchAnime(req, res) {
	var name = req.params.name;
	if (name) {
		var url = 'http://animeindo.web.id/' + name;
		request(url, function(error, response, html) {
			if (!error) {
				var $ = cheerio.load(html);
				var title, stream, streamStart, streamStop;
				var body = $('.bannertit');
				var video = $('.player-area');

				title = name.replace('-', ' ');
				stream = video.children().children().children().children('div').children('script').text();
				streamStart = stream.indexOf('http://www.blogger.com/video-play.mp4');
				streamStop = stream.indexOf('"image"') - streamStart;
				stream = stream.substr(streamStart, streamStop - 10);
			    res.status(200).json({
			    	title: title, 
			    	stram: stream
			    });
			} else {
			    res.status(403).json({status: false, message: 'Page error!'});
			}
		});
	} else {
	    res.status(500).json({status: false, message: 'Anime not found!'});
	}
}

// Run
console.log('App Started');
app.listen(port);