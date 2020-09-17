/* eslint-disable no-await-in-loop */
const fetch = require('node-fetch');
const cal = require('ical-generator');
const moment = require('moment');
const markdownTable = require('markdown-table');

const normalize = (team) => {
  const withoutSpacesAndHyphens = team.replace(/-|\s/g, '');
  const normalized = withoutSpacesAndHyphens.normalize();
  return normalized.toLowerCase();
};

class SwebowlClient {
  apiKey = '';

  baseUrl = '';

  constructor({ baseUrl, apiKey }) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  get(url) {
    return fetch(`${this.baseUrl}${url}&APIKey=${this.apiKey}`, {
      headers: {
        authority: 'api.swebowl.se',
        referer: 'https://bits.swebowl.se/seriespel',
      },
    }).then((r) => r.json());
  }
}

const buildCalendar = async (incomingTeamName) => {
  // first we need an api token which we can extract from the bits homepage
  const pageVisitHTMLString = await fetch('https://bits.swebowl.se').then((r) =>
    r.text()
  );

  const [, apiKey] = pageVisitHTMLString.match(/apiKey: "(.+)"/);

  const BitsClient = new SwebowlClient({
    baseUrl: 'https://api.swebowl.se/api/v1',
    apiKey,
  });
  // then we request all games

  const allGames = await BitsClient.get('/Match?seasonId=2020');

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

  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    // https:// api.swebowl.se/api/v1/matchResult/GetMatchScores?APIKey=62fcl8gPUMXSQGW1t2Y8mc2zeTk97vbd&matchId=3200970

    const buildStatsTable = async (match) => {
      const matchSchemeId = await BitsClient.get(
        `/matchResult/GetHeadInfo?id=${match.matchId}`
      );

      const matchResultsForTeams = await BitsClient.get(
        `/matchResult/GetMatchResults?matchSchemeId=${matchSchemeId}&matchId=${match.matchId}`
      );

      const isHomeTeam =
        normalize(match.matchHomeTeamName) === normalizedTeamName;

      const playerList =
        isHomeTeam === matchResultsForTeams.playerListHome ||
        matchResultsForTeams.playerListAway;

      return markdownTable([
        ['name', '1', '2', '3', '4', 'Series', 'BanP', 'Plats'],
        ...playerList.map((p) => [
          p.player,
          p.result1,
          p.result2,
          p.result3,
          p.result4,
          p.totalSeries,
          p.lanePoint,
          p.place,
        ]),
      ]);
    };

    const matchResultTable = match.matchHasBeenPlayed
      ? await buildStatsTable(match)
      : '';

    calendar.createEvent({
      start: moment(match.matchDateTime),
      end: moment(match.matchDateTime).add(3, 'hours'),
      id: match.matchId,
      summary: match.matchHasBeenPlayed
        ? `${match.matchVsTeams} - ${match.matchVsResult}`
        : match.matchVsTeams,
      description: `${
        match.matchHasBeenPlayed
          ? `<b>${match.matchVsResult}</b>\n\n${matchResultTable}`
          : match.matchOilPatternName
      }\n<a href="${
        match.matchHallOnlineScoringUrl
      }">Live Scoring Available Here</a>`,
      location: match.matchHallName,
    });
  }
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
