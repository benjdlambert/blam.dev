const { normalize, buildCalendar } = require('bits-bowling-calendar');

exports.handler = async (event, context, callback) => {
  console.warn(context);
  console.warn(event);

  const teamName = normalize('BK-TROL');

  const calendar = await buildCalendar(teamName);
  callback(null, {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/calendar;charset=utf-8',
      'Content-Disposition': 'attachment; filename="calendar.ics"',
    },
    body: calendar,
  });
};
