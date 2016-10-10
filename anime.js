var express = require('express');
var app = express();
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');

// Config
var port = process.env.PORT | 8888;

// Route
app.get('/', greeting);
app.get('/anime', listAnime);
app.get('/anime/:name', watchAnime);

// Controller
function greeting(req, res) {
	res.status(200).json({
		status: true,
		message: 'Feel free stream anime API'
	});
}

/**
 * Get list anime
 * @param  {Object} req
 * @param  {Object} res
 * @return {Void}
 */
function listAnime(req, res) {
	var page = req.query.page || '0';
	var url = 'http://animeindo.web.id/page/' + page;
	var host = req.get('host');
	var baseUrl = req.protocol + '://' + host + '/anime/';

	request(url, function(error, response, html) {
		if (!error) {
			var $ = cheerio.load(html);
			var datas = [];
			var title, thumbnail, uploaded, detail, image, url;
			var data = $('#episodes').children('.episode');

			data.each(function(index, el) {
				detail = $(this).children('.episode-details');
				image = $(this).children('.episode-image').children('a');

				title = detail.children('h3').text().replace(' Subtitle Indonesia', '');
				uploaded = detail.children('div').children('.episode-meta').text();
				thumbnail = image.children('.primary').attr('src');
				url = image.attr('href');

				datas.push({
					title: title ? title : 'No title',
					uploaded: uploaded ? uploaded : false,
					thumbnail: thumbnail ? thumbnail : 'default',
					url: url ? baseUrl + url.split('/')[5] : false
				});
			});
		    res.status(200).json(datas);
		} else {
		    res.status(403).json({status: false, message: 'Page error!'});
		}
	});
}

/**
 * View Anime detail
 * @param  {Object} req 
 * @param  {Object} res 
 * @return {Void}
 */
function watchAnime(req, res) {
	var name = req.params.name;
	var host = req.get('host');
	var baseUrl = req.protocol + '://' + host + '/anime/';

	if (name) {
		var url = 'http://animeindo.web.id/' + name;
		request(url, function(error, response, html) {
			if (!error) {
				var $ = cheerio.load(html);
				var title, stream, streamStart, streamStop, prev, index, next;
				var body = $('.bannertit');
				var video = $('.player-area');
				var options = $('#episode-options');

				title = name.replace('-subtitle-indonesia', '').replaceAll('-', ' ');
				stream = video.children().children().children().children('div').children('script').text();
				streamStart = stream.indexOf('http://www.blogger.com/video-play.mp4');
				streamStop = stream.indexOf('"image"') - streamStart;
				stream = stream.substr(streamStart, streamStop - 10);

				prev = options.children('.ep-prev').children('a').attr('href');
				index = options.children('.ep-more').children('a').attr('href');
				next = options.children('.ep-next').children('a').attr('href');

				var baseResult = {
			    	title: title, 
			    	stram: stream,
			    	nav: {
			    		prev: prev ? baseUrl + prev.split('/')[5] : false,
			    		index: false,
			    		next: next ? baseUrl + next.split('/')[5] : false
			    	}
			    };

				// getRating(res, name, baseResult); // Rating
				res.status(200).json(baseResult);
			} else {
			    res.status(403).json({status: false, message: 'Page error!'});
			}
		});
	} else {
	    res.status(500).json({status: false, message: 'Anime not found!'});
	}
}

/**
 * Get rating (Too slow not recomended)
 * @param  {Object} res
 * @param  {String} name
 * @param  {Object} baseResult
 * @return {Void}
 */
function getRating(res, name, baseResult) {
	var searchAble = name.replace('-subtitle-indonesia', '').replaceAll('-', '+');
	var urlRating = 'https://myanimelist.net/search/prefix.json?type=anime&keyword=' + searchAble + '&v=1';
	request(urlRating, function(error, response, html) {
		if (!error) {
			var listResult = JSON.parse(response.body).categories[0].items;
			if (listResult.length >= 1) {
				baseResult.payload = listResult[0].payload;
				baseResult.payload.name = listResult[0].name;
				res.status(200).json(baseResult);
			} else {
				res.status(200).json(baseResult);
			}
		} else {
			res.status(200).json(baseResult);
		}
	});
}

/**
 * Replace all string
 * @param  {String} search
 * @param  {String} replacement
 * @return {String}
 */
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

// Run
console.log('App Started');
app.listen(port);