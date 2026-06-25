const JIRA_BASE = 'https://musinsa-oneteam.atlassian.net';
const JIRA_EMAIL = 'mijin.chang@29cm.co.kr';
const JIRA_TOKEN = 'ATATT3xFfGF0-5n3Byi5utW0nwGSBf4KJReVOB3OJSEdAqE6p2nHpmXY3XlNvDd03F-9W8NxZMa5R2NHvDosK8llCm6bCBuebaHWOhGQku8G_N0-wBNwXQosENeW9b8X84IlSrPhlef-s7rt6D61jK3_KpOzi033TwZjvKaEY24Jhij5x8MhH1I=3EACE8EE';
const AUTH = 'Basic ' + Buffer.from(JIRA_EMAIL + ':' + JIRA_TOKEN).toString('base64');

const ASSIGNEE_MAP = {
  '712020:19e84b87-2a63-4584-a099-87eed24f86e4': '장미진',
  '712020:ac6ee917-de1d-4ec8-8c83-215625056596': '김다운',
  '712020:1c2f6acc-e88a-4507-8d4a-cd968ca25985': '김정탁',
  '712020:26c8baf3-b489-4ea8-a248-191a4242b0c0': '김태연',
  '712020:58531949-bfc1-4372-9e7b-5861dd285a16': '손효정',
  '5fa4b0f358f262007285553b': '이진용',
};

exports.handler = async () => {
  const accountIds = Object.keys(ASSIGNEE_MAP).join('","');
  const jql = `assignee in ("${accountIds}") AND statusCategory != Done ORDER BY updated DESC`;
  const fields = 'summary,status,assignee,project,duedate,customfield_10014,customfield_10015,issuetype';

  let allIssues = [];
  let startAt = 0;

  try {
    while (true) {
      const url = `${JIRA_BASE}/rest/api/2/search?` + new URLSearchParams({
        jql, fields, maxResults: 100, startAt
      });
      const res = await fetch(url, {
        headers: { Authorization: AUTH, Accept: 'application/json' }
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Jira API ${res.status}: ${txt.slice(0,300)}`);
      }
      const data = await res.json();
      allIssues = allIssues.concat(data.issues || []);
      if ((data.issues || []).length < 100 || allIssues.length >= data.total) break;
      startAt += 100;
    }

    const parsed = allIssues.map(i => {
      const f = i.fields;
      const assigneeId = (f.assignee || {}).accountId || '';
      const assignee = ASSIGNEE_MAP[assigneeId] || (f.assignee || {}).displayName?.split('/')[0].trim() || '';
      const proj = f.project?.key || '';
      return {
        key: i.key,
        title: (f.summary || '').trim(),
        statusName: f.status?.name || '',
        assignee,
        project: proj,
        projectName: proj === 'M29CMPROD' ? '29CM' : proj === 'PD' ? '무신사' : (f.project?.name || proj),
        duedate: f.duedate || null,
        startdate: f.customfield_10015 || null,
        epic: f.customfield_10014 || null,
        issuetype: f.issuetype?.name || '',
      };
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(parsed),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
