
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

const PROJECT_IDS = {
	DMD: 28240555,
	MEAL_BREAK: 28287833
};

const TASK_IDS = {
	CLIENT_REPORTS: 16369232,
	CLIENT_INDUSTRY_RESEARCH: 16346754,
	DATA_PROJECTS: 16346322,
	EL_TORO: 16369229,
	EMAIL_BLASTS: 16369231,
	GMC_SETUPS: 16369225,
	JOB_RELEASE: 16369227,
	MAIL_SUMMARY: 16369228,
	MEAL_BREAK: 16378256,
	QUALITY_CONTROL: 16312770,
	SITE_SCRAPING: 16369230,
	SOP_DOCUMENTATION: 16376934,
	TRAINING: 16376933,
	TRUCKING: 16346383,
	VENDOR_TESTS: 16369226
};

class TimeEntry {
	constructor(date, projectID, taskID, notes, hours) {
		this.date = date;
		this.projectID = projectID;
		this.taskID = taskID;
		this.notes = notes;
		this.hours = hours;
	};
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
	return inputDate;
}

/**
 * Returns a string representation of the date separated by hyphens in the format YYYY-MM-DD.
 * @param {Date} inputDate the date to convert to a hyphen-separated string
 * @returns a string representation of the date separated by hyphens in the format YYYY-MM-DD
 */
function convertToCalendarDate(inputDate) {
	return inputDate.toISOString().substring(0, 10);
}

/**
 * Returns an array of all time entries for the work week including and after the given start date.
 * @param {Date} startDate the starting date to time entries
 * @returns the array of time entry objects
 */
function getTimeEntries(startDate) {
	let dayCounter = DAY_RANGE.START;
	const timeEntries = [];

	// Populate the array of time entries
	while (dayCounter <= DAY_RANGE.END) {
		// Create a new date reference to avoid overwriting the original start date
		let currentDate = new Date(startDate);
		currentDate.setDate(startDate.getDate() + (dayCounter - DAY_RANGE.START));
		currentDate = convertToCalendarDate(currentDate);

		// Daily tasks
		timeEntries.push(new TimeEntry(currentDate, PROJECT_IDS.DMD, TASK_IDS.TRUCKING, "Daily trucking", 0.5));
		timeEntries.push(new TimeEntry(currentDate, PROJECT_IDS.DMD, TASK_IDS.MAIL_SUMMARY, "Daily mail summaries", 0.5));
		timeEntries.push(new TimeEntry(currentDate, PROJECT_IDS.DMD, TASK_IDS.CLIENT_REPORTS, "DMD meeting", 1.0));
		timeEntries.push(new TimeEntry(currentDate, PROJECT_IDS.DMD, TASK_IDS.CLIENT_REPORTS, "JS clean-up", 1.0));
		timeEntries.push(new TimeEntry(currentDate, PROJECT_IDS.DMD, TASK_IDS.GMC_SETUPS, "New setups + updates", 3.0));
		timeEntries.push(new TimeEntry(currentDate, PROJECT_IDS.MEAL_BREAK, TASK_IDS.MEAL_BREAK, "Lunch", 1.0));

		switch (dayCounter) {
			case 1:
				// Monday-only tasks
				timeEntries.push(new TimeEntry(currentDate, PROJECT_IDS.DMD, TASK_IDS.TRUCKING, "Programmers meeting", 1.0));
				timeEntries.push(new TimeEntry(currentDate, PROJECT_IDS.DMD, TASK_IDS.SOP_DOCUMENTATION, "SOPs + Scripts", 1.0));
				break;
			case 2:
				// Tuesday-only tasks
				timeEntries.push(new TimeEntry(currentDate, PROJECT_IDS.DMD, TASK_IDS.SOP_DOCUMENTATION, "SOPs + Scripts", 2.0));
				break;
			case 3:
				// Wednesday-only tasks
				timeEntries.push(new TimeEntry(currentDate, PROJECT_IDS.DMD, TASK_IDS.JOB_RELEASE, "Ongoing Core releases", 2.0));
				break;
			case 4:
				// Thursday-only tasks
				timeEntries.push(new TimeEntry(currentDate, PROJECT_IDS.DMD, TASK_IDS.JOB_RELEASE, "Ongoing eDMS releases", 2.0));
				break;
			case 5:
				// Friday-only tasks
				timeEntries.push(new TimeEntry(currentDate, PROJECT_IDS.DMD, TASK_IDS.JOB_RELEASE, "Special releases", 1.0));
				timeEntries.push(new TimeEntry(currentDate, PROJECT_IDS.DMD, TASK_IDS.SOP_DOCUMENTATION, "SOPs + Scripts", 1.0));
				break;
			case 6:
				// Saturday-only tasks
				break;
			case 7:
				// Sunday-only tasks
				break;
			default:
				break;
		}

		++dayCounter;
	}

	return timeEntries;
}

/**
 * Inserts a new time entry using the Harvest API and outputs the response to the console.
 * @param entry the class representation of the time entry data
 * @param attempts the current number of post request attempts
 */
function insertEntry(entry, attempts) {
	const params = {
		"spent_date": entry.date,
		"project_id": entry.projectID,
		"task_id": entry.taskID,
		"notes": entry.notes,
		"hours": entry.hours,
	};

	fetch(URL, {
		method: "POST",
		headers: headers,
		body: JSON.stringify(params)
	})
			.then(response => {
				if (response.ok || attempts >= 100) {
					console.log(
							`\r(${attempts}) ${response.status} ${response.statusText}: ` +
							`${entry.date} - ${entry.notes} - ${entry.hours} hrs`
					);
				} else {
					process.stdout.write(`\rInsertion failed (${response.status}: ${response.statusText}) - retrying ...`);
					setTimeout(insertEntry, 500, entry, ++attempts);
				}
			});
}

/**
 * Pushes a default list of tasks to the current week of a user's timesheet to Harvest.
 */
function updateWeekTimesheets() {
	const currentDate = getCurrentDatePST();
	const startDate = getStartDate(currentDate);

	const timeEntries = getTimeEntries(startDate);

	timeEntries.forEach(entry => {
		insertEntry(entry, 1);
	});
}

updateWeekTimesheets();
