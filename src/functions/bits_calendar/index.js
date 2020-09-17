const fetch = require('node-fetch');
const cal = require('ical-generator');
const moment = require('moment');

const normalize = (team) => {
  const withoutSpacesAndHyphens = team.replace(/-|\s/g, '');
  const normalized = withoutSpacesAndHyphens.normalize();
  return normalized.toLowerCase();
};

const buildCalendar = async (incomingTeamName) => {
  // first we need an api token which we can extract from the bits homepage
  const pageVisitHTMLString = await fetch('https://bits.swebowl.se').then((r) =>
    r.text()
  );

  const [, apiKey] = pageVisitHTMLString.match(/apiKey: "(.+)"/);

  // then we request all games
  const allGames = await fetch(
    `https://api.swebowl.se/api/v1/Match?APIKey=${apiKey}&seasonId=2020`,
    {
      headers: {
        authority: 'api.swebowl.se',
        referer: 'https://bits.swebowl.se/seriespel',
      },
    }
  ).then((r) => r.json());

  const normalizedTeamName = normalize(incomingTeamName);

  // then we filter the games to include the team name
  const matches = allGames.filter(
    (game) =>
      normalize(game.matchAwayTeamName) === normalizedTeamName ||
      normalize(game.matchHomeTeamName) === normalizedTeamName
  );

  if (matches.length === 0) {
    return '';
  }

  const teamName =
    normalize(matches[0].matchAwayTeamName) === normalizedTeamName
      ? matches[0].matchAwayTeamName
      : matches[0].matchHomeTeamName;

  const calendar = cal({ name: `${teamName}'s Bowling Calendar 2020` });

  console.warn(matches);

  matches.forEach((match) => {
    calendar.createEvent({
      start: moment(match.matchDateTime),
      end: moment(match.matchDateTime).add(3, 'hours'),
      id: match.matchId,
      summary: match.matchHasBeenPlayed
        ? `${match.matchVsTeams} - ${match.matchVsResult}`
        : match.matchVsTeams,
      description: `${
        match.matchHasBeenPlayed
          ? match.matchVsResult
          : match.matchOilPatternName
      }\n${match.matchHallOnlineScoringUrl}`,
      location: match.matchHallName,
    });
  });
  // then we return the calendar
  return calendar.toString();
};

exports.handler = async (event, context, callback) => {
  const pathSplit = event.path.split('/');
  const teamName = pathSplit[pathSplit.length - 1];
  const calendar = await buildCalendar(teamName);

  callback(null, {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/calendar;charset=utf-8',
      'Content-Disposition': 'attachment; filename="calendar.ics"',
      'Cache-Control': 'public, s-maxage=300',
    },
    body: calendar,
  });
};
