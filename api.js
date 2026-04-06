"use strict"
// snake_case お願いします
//
// TODO:
// timezone conversion T_T

const helpers = require("./helpers.js");
const format_broadcast = helpers.format_broadcast;
const get_day = helpers.get_day;

require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");
const https = require("https");

const CLIENT_ID = process.env.CLIENT_ID;
const VERSION = process.env.npm_package_version;
const IS_DEV = process.env.APP_ENV == "dev" ? true : false;
const PORT = IS_DEV ? process.env.DEV_PORT : process.env.PROD_PORT;

const credentials = {
	key: fs.readFileSync(IS_DEV ? process.env.DEV_PRIVATE_KEY : process.env.PROD_PRIVATE_KEY, "utf8"),
	cert: fs.readFileSync(IS_DEV ? process.env.DEV_CERTIFICATE : process.env.PROD_CERTIFICATE, "utf8"),
};

app.use("/static", express.static(path.join(__dirname, "public")));

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname,"index.html"));
});

app.get("/:rss/:username", async (req, res) => {
	console.log(`[LOG]:   ${req.headers['x-forwarded-for']}\trequested: ${req.originalUrl}`);
	const username = req.params.username;
	const rss = req.params.rss == "rss";
	const waybar = req.params.rss == "waybar";

	// drop requests that have not specified a format
	if (!rss && !waybar) {
		console.log(`[ERROR]: malformed request`);
		res.status(400).json({
			error: "malformed request",
			tip: "usage: /{rss|waybar}/username"
		});
		return;
	}

	// get user's currently watching anime
	const watching_res = await fetch(`https://api.myanimelist.net/v2/users/${username}/animelist?status=watching`, {
		method: "GET",
		headers: {
			"X-MAL-CLIENT-ID": CLIENT_ID
		}
	});
	if (watching_res.status == 404)	{
		console.log(`[ERROR]: ${req.originalUrl} not found`);
		res.status(404).json({
			error: "user not found"
		});
		return;
	}
	// extract the MAL IDs for the anime entries
	const watching_ids = (await watching_res.json()).data.map(anime => anime.node.id);
	if (watching_ids.length == 0)
		console.log(`[INFO]:  ${req.originalUrl} returned no currently watching anime`);

	// get the anime release schedule
	// NB: doesn't actually send any request to MAL if watching_ids is empty
	//     the rest of the code just copes
	const anime_details = await Promise.all(
		watching_ids.map(async (anime_id) => {
			const anime_detail_res = await fetch(`https://api.myanimelist.net/v2/anime/${anime_id}?fields=id,title,main_picture,start_date,end_date,status,start_season,broadcast`, {
				method: "GET",
				headers: {
					"X-MAL-CLIENT-ID": CLIENT_ID
				}
			});
			return await anime_detail_res.json();
		})
	);
	// filter currently airing anime
	const anime_current = anime_details.filter(anime_detail => anime_detail.status == "currently_airing");
	// add order property to make it sortable
	anime_current.forEach(anime => anime.order = parseInt(`${get_day(anime.broadcast?.day_of_the_week)}${anime.broadcast?.start_time.replace(":", '')}`));
	anime_current.sort((a, b) => a.order - b.order);
	// format broadcast
	let anime_today = 0;
	let today = get_day(new Intl.DateTimeFormat("en-GB", {
		weekday: "long"
	}).format(new Date()).toLowerCase());
	anime_current.forEach(anime => {
		if (get_day(anime.broadcast?.day_of_the_week) == today)
			anime_today++;
		anime.broadcast = format_broadcast(anime.broadcast)
	});

	let formatted_rows = new Array();
	for (const anime of anime_current) {
		if (anime.title.length > 51)
			formatted_rows.push(`${anime.broadcast}${anime.title.slice(0, 48) + "..."}`);
		else
			formatted_rows.push(`${anime.broadcast}${anime.title}`);
	}

	const tooltip = `currently airing:\n
${formatted_rows.join('\n')}`

	if (rss) {
		// format the rows into RSS
		formatted_rows.forEach(function(row, index) { this[index] =
`<item xml:space="preserve">
<title>${row}</title>
<description>${anime_current[index].title}</description>
</item>`
		}, formatted_rows);

		res.type("text/xml");
		res.send(
`<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
<title>RSS for MyAnimeList</title>
<description>${username}'s currently airing schedule</description>
<link>https://rfm.toralv.dev</link>
<ttl>0</ttl>
${formatted_rows.join('\n')}
</channel>
</rss>
`);
	} else if (waybar) {
		res.status(200).json({
			text: anime_today,
			tooltip: tooltip
		});
	} else {
		res.status(500).json({
			error: "unexpected error"
		});
	}
});

const https_server = https.createServer(credentials, app);
https_server.listen(PORT, () => console.log("Running on port " + PORT));
