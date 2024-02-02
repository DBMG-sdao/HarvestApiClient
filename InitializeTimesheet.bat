
@echo off

rem Change to the project directory in order to load the environment variables
cd "C:\Users\%username%\Documents\Projects\HarvestApiClient\src"

echo:
echo Clearing this week's timesheet ...
echo:
node "clearWeekTimesheet.js"
echo Done

echo:
echo Inserting time entries ...
echo:
node "updateWeekTimesheet.js"
echo Done

echo:
pause
exit
