module.exports = {
    IPV4_QUERY_URL : 'http://v4.ip.zxinc.org/getip',
    IPV6_QUERY_URL : 'http://v6.ip.zxinc.org/getip',
    RECORDS : [
        {
            type: 'A',
            name: '<your ipv4 domain>'
        },
        {
            type: 'AAAA',
            name: '<your ipv6 domain>'
        }
    ],
    cloudflare : {
        ZONE_ID : '<your zone id>',
        AUTHORIZATION : '<your authorization>',
        SELECT_RECORDS_URL : function() {
            return `https://api.cloudflare.com/client/v4/zones/${this.ZONE_ID}/dns_records`
        },
        UPDATE_RECORDS_URL : function (recordId) {
            return `https://api.cloudflare.com/client/v4/zones/${this.ZONE_ID}/dns_records/${recordId}`
        }
    },
    log4js : {
        appenders: {
            stdout: {
                type: 'console'
            },
            main: {
                type: 'dateFile',
                filename: '/var/log/cloudflare-ddns/main.log',
                pattern: '.yyyy-MM-dd',
                keepFileExt: true
            }
        },
        categories: {
            main: {
                appenders: ['stdout', 'main'],
                level: 'debug',
                enableCallStack: true
            },
            default: {
                appenders: ['stdout'],
                level: 'debug',
                enableCallStack: true
            }
        }
    }
}