import { getWin } from './main-window';
import { IPC } from './ipc-events.const';
import { session } from 'electron';
import { ClickupCfg } from '../src/app/features/issue/providers/clickup/clickup.model';
// import rp from 'request-promise';
// const rp = require('request-promise');
import fetch from 'node-fetch';
import { Agent } from 'https';
import { log, error } from 'electron-log';

export const sendClickupRequest = ({
  requestId,
  requestInit,
  url,
  clickupCfg,
}: {
  requestId: string;
  requestInit: RequestInit;
  url: string;
  clickupCfg: ClickupCfg;
}): void => {
  const mainWin = getWin();
  // log('--------------------------------------------------------------------');
  // log(url);
  // log('--------------------------------------------------------------------');

  fetch(url, {
    ...requestInit,
    // allow self signed certificates
    ...(clickupCfg && clickupCfg.isAllowSelfSignedCertificate
      ? {
          agent: new Agent({
            rejectUnauthorized: false,
          }),
        }
      : {}),
  })
    .then((response) => {
      // log('JIRA_RAW_RESPONSE', response);
      if (!response.ok) {
        error('Clickup Error Error Response ELECTRON: ', response);
        try {
          log(JSON.stringify(response));
        } catch (e) {}
        throw Error(response.statusText);
      }
      return response;
    })
    .then((res) => res.text())
    .then((text) => (text ? JSON.parse(text) : {}))
    .then((response) => {
      mainWin.webContents.send(IPC.JIRA_CB_EVENT, {
        response,
        requestId,
      });
    })
    .catch((err) => {
      mainWin.webContents.send(IPC.JIRA_CB_EVENT, {
        error: err,
        requestId,
      });
    });
};

// TODO simplify and do encoding in frontend service
export const setupRequestHeadersForImages = (
  clickupCfg: ClickupCfg,
  wonkyCookie?: string,
): void => {
  const { host, protocol } = parseHostAndPort(clickupCfg);

  // TODO export to util fn
  // const _b64EncodeUnicode = (str): string => {
  //   return Buffer.from(str || '').toString('base64');
  // };
  const encoded = clickupCfg.apiToken;
  const filter = {
    urls: [`${protocol}://${host}/*`],
  };

  if (clickupCfg.isWonkyCookieMode && !wonkyCookie) {
    session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
      callback({ cancel: true });
    });
  }

  // thankfully only the last attached listener will be used
  // @see: https://electronjs.org/docs/api/web-request
  session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    if (wonkyCookie && clickupCfg.isWonkyCookieMode) {
      details.requestHeaders.Cookie = wonkyCookie;
    } else {
      details.requestHeaders.authorization = `${encoded}`;
    }
    callback({ requestHeaders: details.requestHeaders });
  });
};

const MATCH_PROTOCOL_REG_EX = /(^[^:]+):\/\//;
const MATCH_PORT_REG_EX = /:\d{2,4}/;

const parseHostAndPort = (
  config: ClickupCfg,
): { host: string; protocol: string; port: number } => {
  let host: string = config.host as string;
  let protocol;
  let port;

  if (!host) {
    throw new Error('No host given');
  }

  // parse port from host and remove it
  if (host.match(MATCH_PORT_REG_EX)) {
    const match = MATCH_PORT_REG_EX.exec(host) as RegExpExecArray;
    host = host.replace(MATCH_PORT_REG_EX, '');
    port = parseInt(match[0].replace(':', ''), 10);
  }

  // parse protocol from host and remove it
  if (host.match(MATCH_PROTOCOL_REG_EX)) {
    const match = MATCH_PROTOCOL_REG_EX.exec(host);
    host = host
      .replace(MATCH_PROTOCOL_REG_EX, '')
      // remove trailing slash just in case
      .replace(/\/$/, '');

    protocol = (match as any)[1];
  } else {
    protocol = 'https';
  }

  // log({host, protocol, port});
  return { host, protocol, port };
};
