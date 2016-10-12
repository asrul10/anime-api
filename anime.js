var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');

// Config
var port = process.env.PORT | 8888;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
var source = 'http://animeindo.web.id';

// Route
app.get('/', greeting);
app.get('/anime', listAnime);
app.get('/anime/:name', watchAnime);
app.get('/anime/detail/:name', detailAnime);
app.post('/anime/search', searchAnime);

// Behavior
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
	var url = source + '/page/' + page;
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
		var url = source + '/' + name;
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
			    		index: index ? baseUrl + 'detail/' + index.split('/')[4] : false,
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
 * View Anime detail
 * @param  {Object} req 
 * @param  {Object} res 
 * @return {Void}
 */
function detailAnime(req, res) {
	var name = req.params.name;
	var host = req.get('host');
	var baseUrl = req.protocol + '://' + host + '/anime/';

	if (name) {
		var url = source + '/category/' + name;
		request(url, function(error, response, html) {
			if (!error) {
				var $ = cheerio.load(html);
				var title, thumbnail, description, summary;
				var episodes = [];
				var desc = $('.cat_box_desc').children('div').text().split('Sinopsis:');
				var epList = $('.episode_list');
				title = $('.amin_week_box_up1').text();
				thumbnail = $('.cat_image').children().attr('href');
				description = desc[0];
				summary = desc[1];
				epList.each(function(index, el) {
					episodes.push(baseUrl + $(this).children('a').attr('href').split('/')[5]);
				});

				res.status(200).json({
					title: title ? title : 'No title',
					thumbnail: thumbnail ? thumbnail : 'default',
					description: description,
					summary: summary ? summary : '',
					episodes: episodes
				});
			} else {
			    res.status(403).json({status: false, message: 'Page error!'});
			}
		});
	} else {
	    res.status(500).json({status: false, message: 'Anime not found!'});
	}
}

function searchAnime(req, res) {
	var search = req.body.filter || '';
	var url = source + '/?s=' + search;
	var host = req.get('host');
	var baseUrl = req.protocol + '://' + host + '/anime/';
	res.status(200).json({
		status: search
	});
}

// Run
console.log('App Started');
app.listen(port);