"use strict"

module.exports = {
	format_broadcast: function(broadcast) {
		switch(broadcast?.day_of_the_week) {
			case "monday":
				return `monday ‎ ‎ ‎ ${broadcast.start_time} - `
				break;
			case "tuesday":
				return `tuesday ‎ ‎ ${broadcast.start_time} - `
				break;
			case "wednesday":
				return `wednesday ${broadcast.start_time} - `
				break;
			case "thursday":
				return `thursday ‎ ${broadcast.start_time} - `
				break;
			case "friday":
				return `friday ‎ ‎ ‎ ${broadcast.start_time} - `
				break;
			case "saturday":
				return `saturday ‎ ${broadcast.start_time} - `
				break;
			case "sunday":
				return `sunday ‎ ‎ ‎ ${broadcast.start_time} - `
				break;
			default:
				return `unknown ‎ ‎ 00:00 - `
		}
	},
	get_day: function(day) {
		switch(day) {
			case "monday":    return 1; break;
			case "tuesday":   return 2; break;
			case "wednesday": return 3; break;
			case "thursday":  return 4; break;
			case "friday":    return 5; break;
			case "saturday":  return 6; break;
			case "sunday":    return 7; break;
			default:          return 99999999; // unknown broadcast is placed at the bottom
		}
	}
}
