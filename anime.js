var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var fuse = require('fuse.js');

// Config
var port = process.env.PORT | 8888;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
var source = 'http://animeindo.web.id';

// Route
app.get('/', greeting);
app.get('/anime', listAnime);
app.get('/anime/watch/:name', watchAnime);
app.post('/anime/search', searchAnime);
app.get('/anime/:name/:ep', detailAnime);

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
			var title, thumbnail, uploaded, detail, image, url, episode;
			var data = $('#episodes').children('.episode');

			data.each(function(index, el) {
				detail = $(this).children('.episode-details');
				image = $(this).children('.episode-image').children('a');

				title = detail.children('h3').text().replace(' Subtitle Indonesia', '');
				uploaded = detail.children('div').children('.episode-meta').text();
				thumbnail = image.children('.primary').attr('src');
				url = image.attr('href');
				if (url) {
					var nameString = url.substr(0, url.indexOf('-subtitle-indonesia') - 3);
					var numberEp = 2;
					if (nameString.substr(nameString.length -1) === '-') {
						numberEp = 3;
					}
					episode = url.substr(url.indexOf('-subtitle-indonesia') - numberEp, numberEp);
					url = url.substr(0, url.indexOf('-subtitle-indonesia') - numberEp - 1);
				}

				datas.push({
					title: title ? title : 'No title',
					uploaded: uploaded ? uploaded : false,
					thumbnail: thumbnail ? thumbnail : 'default',
					url: url ? baseUrl + url.split('/')[5] + '/' + parseInt(episode): false
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
function detailAnime(req, res) {
	var name = req.params.name;
	var ep = req.params.ep || '';
	var host = req.get('host');
	var baseUrl = req.protocol + '://' + host + '/anime/watch/';

	if (name) {
		var url = source + '/category/' + name;
		request(url, function(error, response, html) {
			if (!error) {
				var $ = cheerio.load(html);
				var title, thumbnail, description, rating, summary;
				var episodes = [];
				var epList = $('.episode_list');
				title = $('.amin_week_box_up1').text();
				thumbnail = $('.cat_image').children().attr('src');
				description = $('.cat_box_desc').children('div').text();

				var indexRating = description.indexOf('Rating');
				indexRating = indexRating != -1 ? indexRating + 8 : description.indexOf('Skor') + 6;
				rating = 0.00;
				if (indexRating !== 5) {
					rating = description.substr(indexRating, 4);
					rating = (parseFloat(rating) / 2).toFixed(2);
					rating = parseFloat(rating);
				}
				console.log(indexRating);

				var indexSummary = description.indexOf('Sinopsis');
				summary = '';
				if (indexSummary != -1) {
					summary = description.substr(indexSummary + 9, description.length - indexSummary);
				}

				epList.each(function(index, el) {
					var watch = baseUrl + $(this).children('a').attr('href').split('/')[5];
					watch = watch.replace('-subtitle-indonesia', '');
					episodes.push(watch);
				});

				res.status(200).json({
					title: title ? title : 'No title',
					thumbnail: thumbnail ? thumbnail : 'default',
					stram: ep ? episodes[episodes.length - ep] : episodes[0],
					// description: description,
					rating: rating,
					summary: summary,
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

function watchAnime(req, res) {
	var name = req.params.name;

	if (name) {
		var url = source + '/' + name + '-subtitle-indonesia';
		request(url, function(error, response, html) {
			if (!error) {
				var $ = cheerio.load(html);
				var stream, streamStart, streamStop;
				var video = $('.player-area');

				stream = video.children().children().children().children('div').children('script').text();
				streamStart = stream.indexOf('http://www.blogger.com/video-play.mp4');
				streamStop = stream.indexOf('"image"') - streamStart;
				stream = stream.substr(streamStart, streamStop - 10);

				res.redirect(stream);
			} else {
  			    res.status(403).json({status: false, message: 'Page error!'});
  			}
		});
	}
}

/**
 * Search Anime
 * @param  {Object} req 
 * @param  {Object} res 
 * @return {Void}
 */
function searchAnime(req, res) {
	var search = req.body.filter || '';
	var url = source + '/anime-list-animeindo';
	var host = req.get('host');
	var baseUrl = req.protocol + '://' + host + '/anime/';

	if (search) {
		request(url, function(error, response, html) {
			if (!error) {
				var $ = cheerio.load(html);
				var anime = $('.amin_box_mid_link');
				var listAnime = [];

				anime.each(function(index, el) {
					var link = $(this).children();
					listAnime.push({
						title: link.text(),
						url: link.attr('href')
					});
				});

				var initSearch = new fuse(listAnime, { keys: ["title"] });
				var result = initSearch.search(search);

				res.status(200).json({
					result: result
				});
			} else {
			    res.status(403).json({status: false, message: 'Page error!'});
			}
		});
	} else {
	    res.status(403).json({status: false, message: 'No keyword!'});
	}
}

// Run
console.log('App Started');
app.listen(port);