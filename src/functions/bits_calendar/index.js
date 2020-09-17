const fetch = require('node-fetch');

exports.handler = async (event, context, callback) => {
  const divisionList = await fetch(
    'https://api.swebowl.se/api/v1/Match?APIKey=62fcl8gPUMXSQGW1t2Y8mc2zeTk97vbd&divisionId=8&seasonId=2020&matchStatus=',
    {
      headers: {
        accept: '*/*',
        'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8,sv;q=0.7',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
      },
      referrer:
        'https://bits.swebowl.se/seriespel?seasonId=2020&divisionId=8&showTeamDivisionTable=true&showAllDivisionMatches=true&showTeamDetails=true',
      referrerPolicy: 'no-referrer-when-downgrade',
      body: null,
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
    }
  ).then((r) => r.json());

  const body = `
  BEGIN:VCALENDAR
  CALSCALE:GREGORIAN
  VERSION:2.0
  X-WR-CALNAME: Trol BK Calendar 2020
  METHOD:PUBLISH
  PRODID:-//Shaun Xu//NONSGML iCal Demo Calendar//EN
  BEGIN:VEVENT
  UID: BLAM
  SUMMARY: TEST
  DESCRIPTION: TEST2
  LOCATION: Birka Bowling and Dart
  CLASS: PUBLIC
  DTSTART: 2020-09-17T16:59:20+00:00
  DTEND: 2020-09-17T19:59:20+00:00
  END:VEVENT
  END:VCALENDAR
  `;

  callback(null, {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/calendar;charset=utf-8',
      'Content-Disposition':
        'attachment; filename="worktile.pro.calendar.my.ics"',
    },
    body,
  });
};
