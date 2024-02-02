
require('dotenv').config({path: '../.env'});


// Range bounds are [1, 7] (Monday - Sunday)
const DAY_RANGE = {
	START: 1,
	END: 5
};

// Environment vars - customize these as needed in the .env file
const ACCOUNT_ID = process.env.ACCOUNT_ID;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const URL = process.env.URL;


const headers = {
	"User-Agent": "HarvestApiClient (sdao@dbmgroup.com)",
	"Harvest-Account-Id": ACCOUNT_ID,
	"Authorization": ACCESS_TOKEN,
	"Accept": "application/json",
	"Content-Type": "application/json"
}

/**
 * Returns the current PST timezone date.
 * @returns {Date} the current PST timezone date
 */
function getCurrentDatePST() {
	const offsetMillis = 420 * 60 * 1000;
	const currentDateMillis = (new Date()).getTime();
	return new Date(currentDateMillis - offsetMillis);
}

/**
 * Returns a Date representing the start date for the week of the input date.
 * @param {Date} inputDate the input date
 * @returns a Date object representing the most recent Monday
 */
function getStartDate(inputDate) {
	while (inputDate.getDay() > DAY_RANGE.START) {
		inputDate.setDate(inputDate.getDate() - 1);
	}
	inputDate.setUTCHours(0, 0, 0, 0);
	return inputDate;
}

/**
 * Deletes a given time entry using its entry ID and prints the response to the console.
 * @param entry the class representation of the time entry data
 * @param attempts the current number of delete request attempts
 */
function deleteEntry(entry, attempts) {
	fetch(URL + `/${entry.id}`, {
		method: "DELETE",
		headers: headers,
	})
			.then(response => {
				if (response.ok || attempts >= 100) {
					console.log(
							`\r(${attempts}) ${response.status} ${response.statusText}: ` +
							`${entry.spent_date} - ${entry.notes} - ${entry.hours} hrs`
					);
				} else {
					process.stdout.write(`\rDeletion failed (${response.status}: ${response.statusText}) - retrying ...`);
					setTimeout(deleteEntry, 500, entry, ++attempts);
				}
			});
}

/**
 * Deletes the current week of time entries using the Harvest API.
 */
function clearWeekTimesheet() {
	const currentDate = getCurrentDatePST();
	const startDate = getStartDate(currentDate);

	fetch(URL, {
		method: "GET",
		headers: headers,
	})
			.then(data => data.json())
			.then(data => {
				// Time entries are sorted by most recent first
				const timeEntries = data.time_entries;

				for (const index in timeEntries) {
					const entry = timeEntries[index];
					const entryDate = new Date(entry.spent_date);

					if (startDate <= entryDate) {
						deleteEntry(entry, 1);
					} else break;
				}
			});
}

clearWeekTimesheet();
