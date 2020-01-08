const http = require('http');
const https = require('https');
const querystring = require('querystring');
const log4js = require('log4js');
const config = require('./config');

class HttpClient {

    constructor () {}

    get(url, headers, queryMap) {
        return this.execute('GET', url, headers, queryMap, {});
    }

    post(url, headers, queryMap, bodyMap) {
        return this.execute('POST', url, headers, queryMap, bodyMap);
    }

    put(url, headers, queryMap, bodyMap) {
        return this.execute('PUT', url, headers, queryMap, bodyMap);
    }

    execute (method, url, headers, queryMap, bodyMap) {
        const options = {};
        options.method = method;
        options.headers = headers;

        const realUrl = url;
        if (queryMap !== null && queryMap !== undefined && Object.keys(queryMap).length !== 0) {
            const queryString = querystring.stringify(queryMap);
            realUrl = realUrl + `?${queryString}`;
        }
        let bodyString = '';
        if (bodyMap !== null && bodyMap !== undefined && Object.keys(bodyMap).length !== 0) {
            if (headers['Content-Type'] === null || headers['Content-Type'] === undefined) {
                options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            }
            if (options.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
                bodyString = querystring.stringify(bodyMap);
                options.headers['Content-Length'] = Buffer.byteLength(bodyString);
            } else if (options.headers['Content-Type'] === 'application/json') {
                bodyString = JSON.stringify(bodyMap);
                options.headers['Content-Length'] = Buffer.byteLength(bodyString);
            }
            
        }
    
        return new Promise((resolve, reject) => {
            const schema = realUrl.startsWith('https') ? https : http;
            const req = schema.request(realUrl, options, (res) => {
                if (res.statusCode >= 400) {
                    const error = new Error(res.statusCode);
                    res.resume();
                    reject(error);
                } else {
                    let data = '';
                    res.setEncoding('utf8');
                    res.on('data', (chunk) => {
                        data = data + chunk;
                    });
                    res.on('end', () => {
                        resolve(data);
                    });
                }
            });
            req.on('error', (error) => {
                reject(error);
            });
            if (bodyMap !== null && bodyMap !== undefined && Object.keys(bodyMap).length !== 0) {
                req.write(bodyString);
            }
            req.end();
        });
    }
}

(async() => {
    log4js.configure(config.log4js);
    const logger = log4js.getLogger('main');

    const client = new HttpClient();
    let currIPV4 = '';
    try {
        currIPV4 = await client.get(config.IPV4_QUERY_URL, {}, {});
        logger.info(`IPV4:${currIPV4}`);
    } catch (error) {
        logger.error(error);
    }

    let currIPV6 = '';
    try {
        currIPV6 = await client.get(config.IPV6_QUERY_URL, {}, {});
        console.log('IPV6:', currIPV6);
        logger.info(`IPV6:${currIPV6}`);
    } catch (error) {
        logger.error(error);
    }

    try {
        const headers = {
            'Authorization': config.cloudflare.AUTHORIZATION,
            'Content-Type': 'application/json'
        };
        const result1 = JSON.parse(await client.get(config.cloudflare.SELECT_RECORDS_URL(), headers, {}, {}));
        const records = result1.result;
        const tasks = config.RECORDS.map(async (record) => {
            for (let i = 0; i < records.length; ++i) {
                const item = records[i];
                if (item.type === record.type && item.name === record.name) {
                    const prevIP = item.content;
                    let currIP = '';
                    if (item.type === 'A') {
                        currIP = currIPV4;
                    } else if (item.type === 'AAAA') {
                        currIP = currIPV6;
                    }
                    if (currIP !== '' && prevIP !== currIP) {
                        logger.info(`[${item.name}] prevIP:${prevIP} currIP:${currIP} will be updated!`);
                        const bodyMap = {
                            'type': item.type,
                            'name': item.name,
                            'content': currIP,
                            'ttl': item.ttl
                        };
                        try {
                            const result2 = JSON.parse(await client.put(config.cloudflare.UPDATE_RECORDS_URL(item.id), headers, {}, bodyMap));
                            if (result2.success) {
                                logger.info(`[${item.name}] prevIP:${prevIP} currIP:${currIP} has been updated!`);
                            } else {
                                logger.error(`[${item.name}] prevIP:${prevIP} currIP:${currIP} failed to update!`);
                                logger.error(result2);
                            }
                        } catch (error) {
                            logger.error(error);
                        }
                    }
                }
            }
        });
        await Promise.all(tasks);
    } catch (error) {
        logger.error(error);
    }
})();
